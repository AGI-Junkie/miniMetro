async page => {
  const check = (value,label) => { if (!value) throw new Error(label); };
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(() => {try {localStorage.removeItem('metro-night');} catch {}});
  await page.goto('http://127.0.0.1:8767/');
  await page.getByRole('button',{name:'开始游戏'}).click();
  await page.getByRole('button',{name:'时间控制'}).click();
  await page.getByRole('button',{name:'暂停',exact:true}).click();
  const world = p => page.evaluate(([x,y]) => {
    const rect=canvas.getBoundingClientRect();
    return {x:rect.x+view.x+x*view.scale,y:rect.y+view.y+y*view.scale};
  },p);
  const station = async i => world(await page.evaluate(index => [stations[index].x,stations[index].y],i));
  const dragThrough = async points => {
    await page.mouse.move(points[0].x,points[0].y);
    await page.mouse.down();
    for (const b of points.slice(1)) await page.mouse.move(b.x,b.y,{steps:8});
    await page.mouse.up();
  };
  await dragThrough([await station(0),await station(1)]);
  check(await page.evaluate(() => lines[0].join()==='0,1' && trains.length===1 && inventory.trains===2),'drag creates line and dispatches train');
  await page.getByRole('button',{name:'线路 2',exact:true}).click();
  await page.evaluate(() => {inventory.crossings=12;});
  await dragThrough([await station(1),await station(2)]);
  check(await page.evaluate(() => passengerChoices(0)[2]===trains[0] && lines[1].join()==='1,2'),'connection enables transfer');
  const result = await page.evaluate(() => {
    stations[0].waiting.push(passenger(2));
    for(let i=0;i<500;i++) moveTrains(.05);
    const scoreBeforeUpgrade=score;
    time=weekDuration-.01;
    const original=Math.random;
    Math.random=()=>0;
    try {simulate(.05);} finally {Math.random=original;}
    return {scoreBeforeUpgrade,week,upgrade:$('screen').open,options:$('choices').children.length};
  });
  check(result.scoreBeforeUpgrade===1 && result.week===2 && result.upgrade && result.options===2,'transfer and two weekly choices');
  const beforeReward=await page.evaluate(() => ({cars:inventory.cars,trains:inventory.trains,time}));
  await page.getByRole('button',{name:'增配车厢',exact:true}).click();
  check(await page.locator('.reward-flight').count()===1,'selected reward flies toward the toolbar');
  check(await page.evaluate(b => inventory.cars===b.cars && time===b.time,beforeReward),'simulation and inventory wait for the reward');
  await page.getByRole('dialog').waitFor({state:'hidden'});
  check(await page.evaluate(b => inventory.cars===b.cars+1 && inventory.trains===b.trains+1,beforeReward),'weekly awards land exactly once');
  const car=await page.getByRole('button',{name:'增加车厢'}).boundingBox();
  const rail=await page.evaluate(() => {
    const p=lineTrack(1,2,1);
    const [a,b]=p.slice(1).map((q,i) => [p[i],q]).sort(([a,b],[c,d]) => distance(c,d)-distance(a,b))[0];
    return [(a.x+b.x)/2,(a.y+b.y)/2];
  });
  await dragThrough([{x:car.x+car.width/2,y:car.y+car.height/2},await world(rail)]);
  check(await page.evaluate(() => trains.find(t => t.line===1).cars===1),'dragged carriage attaches');
  const departure=await page.evaluate(() => {
    const train=trains.find(t => t.line===1);
    const route=lines[1];
    train.stop=0; train.direction=1; train.dwell=0; train.velocity=40; train.progress=15;
    train.riders=[passenger(stations[route[1]].type),passenger(stations[0].type)];
    return {score, free:inventory.trains, cars:inventory.cars, crossings:usedCrossings()};
  });
  await page.getByRole('button',{name:'拆线'}).click();
  check(await page.evaluate(d => !lines[1].length && retiring.length===1 && inventory.trains===d.free &&
    inventory.cars===d.cars && usedCrossings()===d.crossings && passengerChoices(0)[2]===null,departure),
    'closed line stops routing while the train and crossing stay reserved');
  check(await page.evaluate(d => {
    for(let i=0;i<500 && retiring.length;i++) moveTrains(.05);
    return !retiring.length && inventory.trains===d.free+1 && inventory.cars===d.cars+1 &&
      usedCrossings()<d.crossings && score===d.score+1 && stations[2].waiting.some(rider => rider.type===stations[0].type);
  },departure),'last trip delivers and transfers riders at the next station before returning stock');
  await dragThrough([await station(0),await station(1),await station(2),await station(0)]);
  check(await page.evaluate(() => looped(lines[1]) && lines[1].join()==='0,1,2,0'),'multi-stop gesture closes ring');
  check(await page.evaluate(() => {
    const t=trains.find(t => t.line===1), before=t.direction;
    stations[2].waiting.push(passenger(1));
    const prior=score;
    for(let i=0;i<550;i++) moveTrains(.05);
    return t.direction===before && score>prior && t.stop<routeSize(lines[1]);
  }),'single-direction ring delivers and never reverses');
  check(await page.evaluate(() => edgeLines.get(edgeKey(0,1)).length===2 && JSON.stringify(lineTrack(0,1,0))!==JSON.stringify(lineTrack(0,1,1))), 'overlapping lines are drawn side by side');
  const segment=await page.evaluate(() => {
    const a=stations[lines[1][1]],b=stations[lines[1][2]],points=trackBetween(a,b);
    const [p,q]=points.slice(1).map((q,i) => [points[i],q]).sort(([a,b],[c,d]) => distance(c,d)-distance(a,b))[0];
    return [(p.x+q.x)/2,(p.y+q.y)/2];
  });
  const breakTo=await world([710,410]);
  const breakFrom=await world(segment);
  await page.mouse.move(breakFrom.x,breakFrom.y);
  await page.mouse.down();
  check(await page.evaluate(() => drag?.insert!==null && Boolean(drag)), 'ring segment is draggable');
  await page.mouse.move(breakTo.x,breakTo.y);
  await page.mouse.up();
  check(await page.evaluate(() => !looped(lines[1]) && lines[1].length===3),'dragging a ring segment away opens the ring');
  await page.evaluate(() => {inventory.interchanges=1;updateHUD();});
  await page.getByRole('button',{name:'放置换乘站'}).click();
  const target=await station(1);
  await page.mouse.click(target.x,target.y);
  check(await page.evaluate(() => stations[1].capacity===18 && inventory.interchanges===0),'interchange raises capacity');
  await page.evaluate(() => {stations[2].waiting=Array.from({length:7},() => passenger(0));stations[2].pressure=overloadLimit-.01;trains.forEach(train => {train.dwell=1;});simulate(.05);});
  check(await page.getByRole('heading',{name:'运营结束'}).isVisible(),'overload ends normal game');
  await page.getByRole('button',{name:'运营统计',exact:true}).click();
  check(await page.locator('#chart [data-series]').count()===3,'three default statistics are plotted');
  const samples=await page.evaluate(() => ({history,score}));
  check(samples.history.at(-1).totalTrips===samples.score && samples.history.at(-1).crowding>=1 &&
    samples.history.some(sample => sample.tripDistance>0 && sample.transfers>0),
    'statistics contain measured trips, distance, transfers and crowding: '+JSON.stringify(samples));
  await page.getByRole('button',{name:'车站',exact:true}).click();
  check(await page.locator('#chart [data-series="stations"]').count()===1,'metric toggle adds its series');
  await page.getByRole('button',{name:'返回结算'}).click();
  check(await page.getByRole('heading',{name:'运营结束'}).isVisible(),'chart returns to settlement');
  const settledState=await page.evaluate(() => ({time,score,lines:JSON.stringify(lines)}));
  await page.getByRole('button',{name:'路网回放',exact:true}).click();
  await page.waitForFunction(() => replay?.index>0);
  check(await page.getByRole('heading',{name:'路网回放'}).count()===1,'settlement opens and plays recorded route history');
  await page.locator('#replaySeek').evaluate(slider => {slider.value=0;slider.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(() => replay.index===0 && !replay.playing);
  const pixelsBefore=await page.evaluate(() => canvas.toDataURL());
  await page.locator('#replaySeek').evaluate(slider => {slider.value=slider.max;slider.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(image => canvas.toDataURL()!==image,pixelsBefore);
  check(await page.evaluate(() => replay.frame.lines.some(route => route.length) &&
    replay.frame.stations.some(station => station.capacity===18)),'seek reconstructs routes and interchange from recorded state');
  const gifEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'保存 GIF',exact:true}).click();
  const gif=await gifEvent;
  check(gif.suggestedFilename()==='mini-metro-london.gif' && !(await gif.failure()) &&
    await page.getByText('GIF 已生成',{exact:true}).isVisible(),'replay downloads an animated GIF');
  await page.keyboard.press('Escape');
  check(await page.getByRole('heading',{name:'运营结束'}).isVisible() &&
    await page.evaluate(state => !replay && time===state.time && score===state.score &&
      JSON.stringify(lines)===state.lines,settledState),'leaving replay keeps the settled game unchanged');
  const beforePhoto=await page.evaluate(() => ({score,time,routes:JSON.stringify(lines)}));
  await page.getByRole('button',{name:'照片模式',exact:true}).click();
  check(await page.getByRole('img',{name:'地铁图照片预览'}).isVisible(),'camera opens an actual map preview');
  const image=await page.evaluate(() => {
    const photo=$('photoPreview');
    const pixels=photo.getContext('2d').getImageData(0,0,photo.width,photo.height).data;
    const rail=Number.parseInt(colors[0].slice(1),16);
    let railPixels=0,opaque=true;
    for(let i=0;i<pixels.length;i+=4) {
      const rgb=(pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2];
      if (rgb===rail) railPixels++;
      if (pixels[i+3]!==255) opaque=false;
    }
    return {railPixels,opaque,data:photo.toDataURL()};
  });
  check(image.opaque && image.railPixels>50 && image.data.startsWith('data:image/png;'),'PNG preview contains opaque map and original rail color');
  await page.getByRole('button',{name:'城市边框'}).click();
  check(await page.evaluate(data => $('photoPreview').toDataURL()!==data,image.data),'frame changes the actual exported image');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'保存 PNG'}).click();
  const download=await downloadPromise;
  check(download.suggestedFilename()==='mini-metro-london.png' && !(await download.failure()),'camera saves a PNG download');
  await page.keyboard.press('Escape');
  check(await page.getByRole('heading',{name:'运营结束'}).isVisible() &&
    await page.evaluate(state => score===state.score && time===state.time && JSON.stringify(lines)===state.routes,beforePhoto),
    'leaving photo mode restores the unchanged settlement');
  await page.getByRole('button',{name:'继续无尽模式'}).click();
  check(await page.evaluate(() => mode==='endless' && phase==='play' && score>0 && !$('scenicMeter').hidden),'endless continues same city and score');
  await page.keyboard.press('3');
  check(await page.evaluate(() => speed===2 && !paused),'3 selects double speed');
  await page.keyboard.press('ArrowLeft');
  check(await page.evaluate(() => speed===1 && !paused),'left arrow steps to normal speed');
  await page.keyboard.press('1');
  check(await page.evaluate(() => paused),'1 pauses the clock');
  await page.keyboard.press('2');
  check(await page.evaluate(() => speed===1 && !paused),'2 resumes normal speed');
  await page.keyboard.press('Escape');
  check(await page.getByRole('heading',{name:'暂停',exact:true}).isVisible(),'Escape opens pause menu');
  const pauseTime=await page.evaluate(() => time);
  await page.getByRole('button',{name:'夜间模式：关',exact:true}).click();
  check(await page.evaluate(t => night && time===t && document.documentElement.classList.contains('night') &&
    getComputedStyle(document.body).backgroundColor==='rgb(48, 48, 48)' && water==='#537c90' && colors[0]==='#fec909' && localStorage.getItem('metro-night')==='true',pauseTime),
    'night mode changes both canvas palette and interface while the city stays paused');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'菜单',exact:true}).click();
  await page.getByRole('button',{name:'城市选择',exact:true}).click();
  await page.getByRole('button',{name:'巴黎',exact:true}).click();
  await page.getByRole('button',{name:'开始游戏'}).click();
  check(await page.evaluate(() => cityKey==='Paris' && score===0 && night && water==='#7ea7b6' && colors[0]==='#f1c830'),'city selector launches another city');
  check(await page.evaluate(() => {
    reset('London');
    inventory.crossings=20;
    // A three-hop local route is shorter in time than the two-hop detour.
    stations=[
      {x:250,y:190,type:0,waiting:[passenger(2)],pressure:0,capacity:6},
      {x:275,y:190,type:1,waiting:[],pressure:0,capacity:6},
      {x:300,y:190,type:1,waiting:[],pressure:0,capacity:6},
      {x:325,y:190,type:2,waiting:[],pressure:0,capacity:6},
      {x:625,y:425,type:1,waiting:[],pressure:0,capacity:6},
    ];
    setRoute(0,[0,4,3]);
    setRoute(1,[0,1,2,3]);
    const [detour,local]=trains;
    detour.dwell=0;
    local.dwell=1;
    service(detour);
    const waited=stations[0].waiting.length===1 && detour.riders.length===0;
    local.dwell=0;
    service(local);
    return waited && local.riders.map(rider => rider.type).join()==='2' && !stations[0].waiting.length;
  }), 'passenger declines a departing two-hop detour to take a faster three-hop train');
  check(await page.evaluate(() => {
    reset('London');
    stations=[
      {x:250,y:190,type:0,waiting:[]},
      {x:275,y:190,type:1,waiting:[]},
      {x:300,y:190,type:2,waiting:[]},
    ];
    setRoute(0,[0,1]);setRoute(1,[1,2]);setRoute(2,[0,2]);
    const [feeder,connection,direct]=trains;
    feeder.dwell=0;
    direct.dwell=1.4;
    const arrival=travelSeconds(trackLength(lineTrack(0,1,0)));
    connection.dwell=arrival+.03;
    const missed=passengerChoices(0,feeder)[2]===direct;
    connection.dwell=arrival+.3;
    return missed && passengerChoices(0,feeder)[2]===feeder;
  }), 'a tight connection is rejected but a feasible one is preferred');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(() => {
    reset('London');
    const random=Math.random;
    Math.random=()=>.99;
    try {upgrade();} finally {Math.random=random;}
  });
  check(await page.locator('#lines .locked').count()===4,'four locked line slots appear initially');
  await page.getByRole('button',{name:'新增线路',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  check(await page.locator('.reward-flight').count()===0 && await page.locator('#lines .locked').count()===3 &&
    await page.getByRole('button',{name:'线路 4',exact:true}).isVisible(),'reduced motion claims and unlocks the correct slot');
  await page.getByRole('button',{name:'菜单',exact:true}).click();
  await page.getByRole('button',{name:'城市选择',exact:true}).click();
  await page.getByRole('button',{name:'伦敦入门教程',exact:true}).click();
  await page.evaluate(() => {paused=true;});
  check(await page.evaluate(() => lesson.stage===0 && stations.length===2 && time===0 && inventory.lines===1 &&
    getComputedStyle($('clock')).visibility==='hidden'),'tutorial starts with two stations and a hidden clock');
  await dragThrough([await station(0),await station(1)]);
  await page.evaluate(() => {for(let i=0;i<400 && lesson.stage<2;i++) simulate(.05);});
  check(await page.evaluate(() => lesson.stage===2 && score===1 && stations[2].type===1),'first delivered rider reveals triangle');
  await dragThrough([await station(0),await station(2)]);
  await page.evaluate(() => {for(let i=0;i<50;i++) simulate(.05);});
  check(await page.evaluate(() => lesson.stage===3 && stations.length===5),'extension reveals two infill stations');
  await dragThrough([await station(1),await station(3)]);
  const middle=await page.evaluate(() => {
    const points=lineTrack(0,1,0);
    const [a,b]=points.slice(1).map((q,i)=>[points[i],q]).sort(([a,b],[c,d])=>distance(c,d)-distance(a,b))[0];
    return [(a.x+b.x)/2,(a.y+b.y)/2];
  });
  await dragThrough([await world(middle),await station(4)]);
  await page.evaluate(() => simulate(.05));
  check(await page.evaluate(() => lesson.stage===4 && lines[0].includes(4) && stations.length===6),'infill lesson opens the opposite bank');
  await dragThrough([await station(3),await station(5)]);
  await page.evaluate(() => simulate(.05));
  check(await page.evaluate(() => !lesson && week===2 && lines[0].length===6 && crossings(lines[0])===1 &&
    localStorage.getItem('metro-tutorial')==='done'), 'crossing finishes lesson and preserves the route');
  await page.getByRole('dialog').locator('#choices button').first().click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  check(await page.evaluate(() => phase==='play' && inventory.lines>=3 && time>=weekDuration &&
    !document.documentElement.hasAttribute('data-lesson')),'reward returns to the same regular game');
  await page.evaluate(() => {unlockedExtreme.clear();localStorage.removeItem('metro-extreme-London');menuCity='London';menuMode='normal';showMenu();});
  await page.getByRole('button',{name:'模式 · 普通'}).click();
  await page.getByRole('button',{name:'模式 · 无尽'}).click();
  check(await page.getByRole('button',{name:'开始游戏'}).isDisabled() &&
    await page.getByText('解锁条件：用至多 1 条通道送达 1,000 人').isVisible(),'locked extreme mode shows London challenge');
  await page.evaluate(() => {
    reset('London');
    inventory.crossings=20;
    setRoute(0,[0,1]);setRoute(1,[1,2]);
    paused=true;checkExtremeChallenge();
    if (!eligibleExtreme) throw new Error('paused edits must not spoil the challenge');
    paused=false;checkExtremeChallenge();
    setRoute(1,[]);score=1000;checkExtremeChallenge();
    if (extremeUnlocked('London')) throw new Error('challenge was restored after a violation');
    reset('London');
    setRoute(0,[0,1]);score=1000;checkExtremeChallenge();
    showMenu();
  });
  await page.getByRole('button',{name:'开始游戏'}).click();
  await page.evaluate(() => {paused=true;inventory.crossings=12;});
  await dragThrough([await station(0),await station(1)]);
  check(await page.getByRole('button',{name:'拆线'}).isDisabled() && await page.evaluate(() => mode==='extreme' &&
    !setRoute(0,[]) && !setRoute(0,[0,2,1]) && lines[0].join()==='0,1'), 'extreme tracks cannot be deleted or have a station inserted');
  await dragThrough([await station(1),await station(2)]);
  check(await page.evaluate(() => lines[0].join()==='0,1,2' && setRoute(0,[0,1,2,0]) &&
    !setRoute(0,[0,1,2]) && lines[0].join()==='0,1,2,0'),'extreme allows extension and permanent closure');
  check(await page.evaluate(() => {
    time=nextStation-4.1;
    simulate(.2);
    const preview=upcomingStation, before=stations.length;
    if (!preview || 'type' in preview) return false;
    time=nextStation-.1;simulate(.2);
    return stations.length===before+1 && !upcomingStation &&
      stations.at(-1).x===preview.x && stations.at(-1).y===preview.y;
  }), 'extreme previews the location before revealing the station type');
  await page.evaluate(() => {
    stations[2].waiting=Array.from({length:7},() => passenger(0));
    stations[2].pressure=overloadLimit-.01;trains.forEach(train => {train.dwell=1;});simulate(.05);
  });
  check(await page.getByRole('heading',{name:'运营结束'}).isVisible(),'overload also ends extreme mode');
  check(await page.evaluate(() => {
    start('London','endless');
    paused=true;
    time=weekDuration+1;
    nextPassenger=nextStation=Infinity;
    for(let i=0;i<27;i++) deliver(passenger(0));
    simulate(.05);
    return week===2 && scenicMilestone===0 && inventory.trains===3 && !$('screen').open;
  }),'endless awards neither a calendar week nor an incomplete milestone');
  check(await page.evaluate(() => {
    deliver(passenger(0));simulate(.05);simulate(.05);
    return scenicEfficiency()===4 && scenicMilestone===1 && nextEfficiency===8 &&
      inventory.trains===4 && inventory.lines===4 && $('score').textContent==='4/8' && !$('screen').open;
  }),'the first efficiency milestone grants assets only once and updates the HUD');
  check(await page.evaluate(() => {
    time+=weekDuration;
    stations[0].waiting=Array.from({length:20},() => passenger(1));
    simulate(overloadLimit+.05);
    updateHUD();
    return phase==='play' && score===28 && scenicEfficiency()===0 && $('score').textContent==='0/8' &&
      scenicMilestone===1 && stations[0].pressure===0 && inventory.trains===4 && !$('screen').open;
  }),'old trips age out without reversing milestones or ending an overcrowded run');
  check(await page.evaluate(() => {
    start('London','endless');
    paused=true;
    nextStation=Infinity;
    inventory.crossings=12;
    setRoute(0,[0,1,2]);
    for(let i=0;i<1600 && scenicMilestone===0;i++) simulate(.05);
    return scenicMilestone>0 && score>=28 && phase==='play' && !$('screen').open;
  }),'a connected network can earn the first milestone from actual demand and train trips');
  const drop=await page.evaluate(() => {
    start('London','normal');
    paused=true;
    inventory.crossings=12;
    setRoute(0,[0,1]);
    const points=lineTrack(0,1,0);
    const [a,b]=points.slice(1).map((q,i) => [points[i],q]).sort(([a,b],[c,d])=>distance(c,d)-distance(a,b))[0];
    return [(a.x+b.x)/2,(a.y+b.y)/2];
  });
  const loco=await page.getByRole('button',{name:'增加机车'}).boundingBox();
  await dragThrough([{x:loco.x+loco.width/2,y:loco.y+loco.height/2},await world(drop)]);
  check(await page.evaluate(([x,y]) => trains.length===2 && distance(trainPose(trains[1]),{x,y})<2 &&
    trains[1].progress>0 && inventory.trains===1,drop),'locomotive is placed on the exact dropped segment');
  await page.evaluate(() => {trains[1].cars=1;inventory.cars=1;updateHUD();});
  const wagon=await page.getByRole('button',{name:'增加车厢'}).boundingBox();
  await dragThrough([{x:wagon.x+wagon.width/2,y:wagon.y+wagon.height/2},await world(drop)]);
  check(await page.evaluate(() => trains[0].cars===0 && trains[1].cars===2 && !inventory.cars),
    'dropped carriage attaches to the nearest train even if another has fewer cars');
  await page.evaluate(() => {
    start('London','normal');paused=true;
    stations=[[200,175,0],[400,175,1],[565,180,2],[780,180,0]].map(([x,y,type]) =>
      ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
    setRoute(0,[0,1]);setRoute(1,[2,3]);
    for (const train of trains) Object.assign(train,{dwell:0,velocity:50,progress:75});
    trains[0].cars=1;
    trains[0].riders=[...Array.from({length:6},() => passenger(2)),passenger(1)];
  });
  const pose=async (train,car=0) => world(await page.evaluate(([train,car]) => {
    const {x,y}=trainPose(trains[train],car);
    return [x,y];
  },[train,car]));
  await dragThrough([await pose(0,1),await pose(1)]);
  check(await page.evaluate(() => trains[0].move?.car===1 && trains[0].cars===1 && trains[1].cars===0),
    'carriage relocation is queued on the original train');
  check(await page.evaluate(() => {
    for(let i=0;i<200 && trains[0].move;i++) moveTrains(.05);
    return !trains[0].move && trains[0].cars===0 && trains[1].cars===1 &&
      trains[0].riders.length===6 && score===1;
  }),'carriage unloads its rider before joining the destination train');
  await page.evaluate(() => {Object.assign(trains[0],{stop:0,direction:1,progress:70,velocity:50,dwell:0});});
  await dragThrough([await pose(0),await world([670,180])]);
  check(await page.evaluate(() => trains[0].move?.line===1 && trains[0].line===0 &&
    trains[0].riders.length===6),'locomotive remains on its old line until arrival');
  check(await page.evaluate(() => {
    for(let i=0;i<200 && trains[0].move;i++) moveTrains(.05);
    return trains[0].line===1 && trains[0].riders.length===0 && stations[1].waiting.length===6 &&
      trains.length===2 && inventory.trains===1;
  }),'locomotive unloads at the next old station and transfers without duplicating assets');
  await page.evaluate(() => {mode='extreme';});
  await dragThrough([await pose(0),await world([300,175])]);
  check(await page.evaluate(() => trains[0].line===1 && !trains[0].move),'extreme blocks dragging deployed vehicles');
  await page.evaluate(() => {
    start('London','normal');paused=true;setRoute(0,[0,1,2]);phase='ended';showResult();
  });
  await page.getByRole('button',{name:'继续创意模式',exact:true}).click();
  check(await page.evaluate(() => mode==='creative' && inventory.lines===7 && inventory.trains===Infinity &&
    lines[0].join()==='0,1,2' && $('trainCount').textContent==='∞'), 'creative continues the same map with all lines and unlimited assets');
  await page.getByRole('button',{name:'编辑车站',exact:true}).click();
  const newSite=await world([735,165]);
  await page.mouse.click(newSite.x,newSite.y);
  await page.getByRole('button',{name:'☆ 星形',exact:true}).click();
  await page.getByRole('button',{name:'客流：低',exact:true}).click();
  await page.getByRole('button',{name:'完成',exact:true}).click();
  check(await page.evaluate(() => stations.length===4 && stations[3].type===4 && stations[3].demand===2),
    'creative adds, reshapes and changes demand with actual clicks');
  const middleStation=await station(1);
  await page.mouse.click(middleStation.x,middleStation.y);
  await page.getByRole('button',{name:'删除车站',exact:true}).click();
  check(await page.evaluate(() => stations.length===3 && lines[0].join()==='0,1' && stations[2].type===4 &&
    trains.every(train => lines[train.line][train.stop]!==undefined)), 'deleting an active stop rewires and remaps the network');
  await page.evaluate(() => {
    stations.forEach(station => {station.demand=0;});
    time=weekDuration;nextStation=0;nextPassenger=0;simulate(.05);
  });
  check(await page.evaluate(() => stations.length===3 && phase==='play' && !$('screen').open &&
    inventory.trains===Infinity), 'creative has no automatic station growth or weekly interruption');
  check(await page.evaluate(() => {
    stations.forEach(station => {station.waiting=[];station.demand=0;});
    stations[2].demand=3;
    spawnPassenger();
    return stations[0].waiting.length===0 && stations[1].waiting.length===0 && stations[2].waiting.length===1;
  }),'station demand controls where new passengers appear');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;
    stations=[[200,175,0],[400,175,1],[600,175,2]].map(([x,y,type]) =>
      ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
    setRoute(0,[0,1,2]);addTrain(0);
    const [lead,following]=trains;
    Object.assign(lead,{stop:0,direction:1,progress:20,velocity:50,dwell:0});
    Object.assign(following,{stop:0,direction:1,progress:0,velocity:0,dwell:0});
    moveTrains(.05);
    const held=following.progress===0 && lead.progress>20;
    for(let i=0;i<30;i++) moveTrains(.05);
    return held && following.progress>0 && lead.progress>following.progress;
  }),'same-direction train waits for headway and then departs');
  check(await page.evaluate(() => {
    const [lead,following]=trains;
    Object.assign(lead,{stop:1,direction:-1,progress:30,velocity:50,dwell:0});
    Object.assign(following,{stop:0,direction:1,progress:0,velocity:0,dwell:0});
    moveTrains(.05);
    return lead.progress>30 && following.progress>0;
  }),'opposite-direction trains do not block each other');
  check(await page.evaluate(() => {
    const [lead,following]=trains;
    Object.assign(lead,{stop:0,direction:1,progress:100,cars:1});
    Object.assign(following,{stop:0,direction:1,progress:55,velocity:96});
    const route=lines[0], spacing=trainSpacing(following,route);
    advanceTrain(following,lineTrack(0,1,0),.1,spacing.room);
    return following.progress===59 && lead.progress-following.progress===41;
  }),'a moving follower brakes behind the last carriage');
  check(errors.length===0,errors.join(', '));
}








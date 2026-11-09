async page => {
  const check = (value,label) => { if (!value) throw new Error(label); };
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('metro-night');
      localStorage.removeItem('metro-colorblind');
    } catch {}
  });
  await page.goto('http://127.0.0.1:8767/');
  await page.evaluate(() => localStorage.removeItem('metro-saved-game-v1'));
  await page.getByRole('button',{name:'开始游戏'}).click();
  await page.getByRole('button',{name:'时间控制'}).click();
  check(await page.evaluate(() => {
    const clock=$('clock').getBoundingClientRect();
    const controls=[...$('time').children].map(button => button.getBoundingClientRect());
    return controls.every((button,i) => button.x===clock.x && button.top>=(i ? controls[i-1].bottom : clock.bottom));
  }),'clock controls open vertically under the clock');
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
  check(await page.evaluate(() => {
    const live=ctx, sample=document.createElement('canvas').getContext('2d');
    const points=[{x:30,y:50},{x:100,y:50},{x:170,y:50}];
    try {
      ctx=sample;
      drawRoute(points,0,true,false,null,null,points.slice(0,2));
      return sample.getImageData(60,50,1,1).data[3]===0 &&
        sample.getImageData(130,50,1,1).data[3]>0;
    } finally {ctx=live;}
  }),'drag preview draws the extension without painting the existing track twice');
  check(await page.evaluate(() => {
    const sample=document.createElement('canvas').getContext('2d');
    const live=ctx, river=new Path2D();
    river.rect(0,50,200,55);
    const fixture=[{x:100,y:20},{x:100,y:135}];
    try {
      ctx=sample;
      drawRoute(fixture,0,false,true,river,{frame:{lines:[[0,1]],stations:fixture},edges:new Map()});
      const opaque=(x,y) => sample.getImageData(x,y,1,1).data[3]>200;
      let pairs=0, gaps=0;
      for (let y=51;y<104;y++) {
        const left=opaque(97,y), right=opaque(102,y);
        if (left!==right || opaque(100,y)) return false;
        if (left) pairs++; else gaps++;
      }
      return pairs>10 && gaps>5 && opaque(100,40) && opaque(100,114);
    } finally {
      ctx=live;
    }
  }),'a tunnel has paired colored dashes and a clear center, with solid track on land');
  check(await page.evaluate(() => {
    const sample=document.createElement('canvas').getContext('2d'), live=ctx, river=new Path2D();
    river.rect(0,50,200,55);
    try {
      ctx=sample;
      ctx.beginPath();ctx.moveTo(100,20);ctx.lineTo(100,135);
      ctx.strokeStyle=colors[0];ctx.globalAlpha=.5;
      strokeTrack([[100,20],[100,135]],river);
      const alpha=(x,y) => sample.getImageData(x,y,1,1).data[3];
      const half=value => value>=120 && value<=130;
      return [35,36,37,38,39,40,41,42,43,44].every(y => half(alpha(100,y))) &&
        half(alpha(97,52)) && half(alpha(102,52)) && alpha(100,52)===0;
    } finally {ctx=live;}
  }),'retiring track is continuously faded on land and keeps the double tunnel rails');
  await page.getByRole('button',{name:'线路 2',exact:true}).click();
  check(await page.evaluate(() => {
    const [first,second,,locked]=$('lines').children;
    const dot=slot=>getComputedStyle(slot,'::before');
    const slot=second.getBoundingClientRect().width;
    return second===document.activeElement && second.getAttribute('aria-pressed')==='true' &&
      Math.abs(parseFloat(dot(first).width)-slot*.8)<1 &&
      Math.abs(parseFloat(dot(second).width)-slot*.4)<1 &&
      dot(second).width===dot(locked).width && dot(second).backgroundColor=== 'rgb(237, 46, 36)' &&
      $('remove').hidden;
  }),'built and empty lines have different dot sizes regardless of empty line selection');
  await page.evaluate(() => {inventory.crossings=12;});
  await dragThrough([await station(1),await station(2)]);
  check(await page.evaluate(() => passengerChoices(0)[2]===trains[0] && lines[1].join()==='1,2'),'connection enables transfer');
  await page.getByRole('button',{name:'线路 1',exact:true}).click();
  check(await page.evaluate(() => {
    const [first,second]=$('lines').children;
    const slot=first.getBoundingClientRect().width;
    return Math.abs(parseFloat(getComputedStyle(first,'::before').width)-slot*1.4)<1 &&
      Math.abs(parseFloat(getComputedStyle(second,'::before').width)-slot*.8)<1 &&
      focusedLine===0 && !$('remove').hidden;
  }),'focusing a built line enlarges its disk and exposes its remove action');
  await page.getByRole('button',{name:'显示或收起工具栏'}).click();
  check(await page.evaluate(() => $('toolbar').inert && focusedLine===null && $('remove').hidden),'toolbar can be collapsed without hiding the map');
  await page.getByRole('button',{name:'显示或收起工具栏'}).click();
  check(await page.evaluate(() => !$('toolbar').inert),'toolbar reopens');
  await page.getByRole('button',{name:'线路 1',exact:true}).focus();
  await page.keyboard.press('ArrowDown');
  check(await page.evaluate(() => $('toolbar').inert && document.activeElement===$('toolbarToggle') &&
    $('toolbarToggle').getAttribute('aria-expanded')==='false'),'down closes the toolbar and preserves keyboard focus');
  await page.keyboard.press('ArrowUp');
  check(await page.evaluate(() => !$('toolbar').inert && $('toolbarToggle').getAttribute('aria-expanded')==='true'),
    'up opens the toolbar');
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
  check(result.scoreBeforeUpgrade===1 && result.week===2 && result.upgrade && result.options===1,'transfer and a weekly locomotive first');
  const beforeReward=await page.evaluate(() => ({cars:inventory.cars,trains:inventory.trains,time}));
  await page.getByRole('button',{name:'机车',exact:true}).click();
  await page.waitForFunction(() => document.getElementById('description').textContent.includes('新资产'));
  check(await page.evaluate(b => document.getElementById('choices').children.length===2 && inventory.trains===b.trains+1 && time===b.time,beforeReward),'locomotive lands first, then two asset choices');
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
  await page.getByRole('button',{name:'线路 2',exact:true}).click();
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
    trains.forEach(t => {t.progress=0;t.velocity=0;t.dwell=5;}); // a train within 9px takes the click as a vehicle drag
    const points=lineTrack(lines[1][1],lines[1][2],1);
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
  check(await page.evaluate(() => looped(lines[1])),'dropping a ring segment on empty space keeps the loop closed');
  await page.keyboard.down('Shift');
  await page.mouse.move(breakFrom.x,breakFrom.y);
  await page.mouse.down();
  const splitLine=await page.evaluate(() => ({selected,line:drag?.line,insert:drag?.insert}));
  check(splitLine.line===1 && splitLine.insert!==null,'Shift grabs the selected ring: '+JSON.stringify(splitLine));
  await page.mouse.move(breakTo.x,breakTo.y);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  check(await page.evaluate(() => !looped(lines[1]) && lines[1].length===3),'Shift-drag deliberately opens the ring');
  await page.evaluate(() => {inventory.interchanges=1;updateHUD();});
  await page.getByRole('button',{name:'放置换乘站'}).click();
  const target=await station(1);
  await page.mouse.click(target.x,target.y);
  check(await page.evaluate(() => stations[1].capacity===18 && inventory.interchanges===0),'interchange raises capacity');
  await page.evaluate(() => {stations[2].waiting=Array.from({length:7},() => passenger(0));stations[2].grace=0;stations[2].pressure=overloadLimit-.01;trains.forEach(train => {train.dwell=1;});simulate(.05);});
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
  check(await page.evaluate(() => {
    const sample=document.createElement('canvas').getContext('2d');
    const live=ctx, wasPaused=paused;
    try {
      ctx=sample;
      const train={line:0,progress:80,points:[{x:0,y:50},{x:200,y:50}],cars:0,riders:[]};
      const head=80+railcar.length/2;
      const opaque=(x,y) => sample.getImageData(Math.floor(x),y,1,1).data[3]>200;
      paused=false;
      drawTrain(train);
      if (opaque(head+3,50)) return false;
      paused=true;
      drawTrain(train);
      return opaque(head+1,46) && opaque(head+4,50) && !opaque(head+4,43);
    } finally {
      ctx=live;
      paused=wasPaused;
    }
  }),'paused locomotive has an attached nose tapering from the full car width');
  await page.keyboard.press('2');
  check(await page.evaluate(() => speed===1 && !paused),'2 resumes normal speed');
  await page.keyboard.press('Escape');
  check(await page.getByRole('heading',{name:'暂停',exact:true}).isVisible(),'Escape opens pause menu');
  const pauseTime=await page.evaluate(() => time);
  await page.getByRole('button',{name:'夜间模式：关',exact:true}).click();
  check(await page.evaluate(t => night && time===t && document.documentElement.classList.contains('night') &&
    getComputedStyle(document.body).backgroundColor==='rgb(48, 48, 48)' && water==='#537c90' && colors[0]==='#fec909' && localStorage.getItem('metro-night')==='true',pauseTime),
    'night mode changes both canvas palette and interface while the city stays paused');
  await page.getByRole('button',{name:'色觉辅助：关',exact:true}).click();
  check(await page.evaluate(t => night && time===t && water==='#537c90' &&
    colors.join(',')==='#e69f00,#58b4e9,#199e69,#ddd101,#3b5798,#a32324,#b1a8b8' &&
    $('lines').querySelector('button').style.getPropertyValue('--line')==='#e69f00' &&
    gifPalette().some(rgb => rgb.join(',')==='230,159,0') &&
    localStorage.getItem('metro-colorblind')==='true',pauseTime),
    'colorblind palette reaches the map, toolbar and GIF while preserving night mode and game time');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'菜单',exact:true}).click();
  await page.getByRole('button',{name:'城市选择',exact:true}).click();
  check(await page.getByRole('button',{name:'巴黎',exact:true}).locator('polyline[stroke="#e69f00"]').count()===1,
    'city preview uses colorblind route colors');
  await page.getByRole('button',{name:'巴黎',exact:true}).click();
  await page.getByRole('button',{name:'开始游戏'}).click();
  check(await page.evaluate(() => cityKey==='Paris' && score===0 && night && water==='#7ea7b6' && colors[0]==='#e69f00'),'city selector preserves colorblind night mode');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'色觉辅助：开',exact:true}).click();
  check(await page.evaluate(() => night && colors[0]==='#f1c830'),'disabling colorblind mode restores the current city palette');
  await page.keyboard.press('Escape');
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
  await page.getByRole('button',{name:'机车',exact:true}).click();
  await page.waitForFunction(() => document.getElementById('description').textContent.includes('新资产'));
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
  await page.getByRole('dialog').getByRole('button',{name:'机车'}).click();
  await page.waitForFunction(() => document.getElementById('description').textContent.includes('新资产'));
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
  await page.getByRole('button',{name:'线路 1',exact:true}).click();
  check(await page.locator('#remove').isHidden() && await page.evaluate(() => mode==='extreme' &&
    !setRoute(0,[]) && !setRoute(0,[0,2,1]) && lines[0].join()==='0,1'), 'extreme tracks cannot be deleted or have a station inserted');
  const extremeTail=await page.evaluate(() => {const tail=terminatorStubs(lines[0])[1];return [tail.x,tail.y];});
  await dragThrough([await world(extremeTail),await station(2)]);
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
    stations[2].grace=0;stations[2].pressure=overloadLimit-.01;trains.forEach(train => {train.dwell=1;});simulate(.05);
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
    for(let i=0;i<3200 && scenicMilestone===0;i++) simulate(.05);
    return scenicMilestone>0 && score>=28 && phase==='play' && !$('screen').open;
  }),'a connected network can earn the first milestone from actual demand and train trips');
  const drop=await page.evaluate(() => {
    start('London','normal');
    paused=true;
    inventory.crossings=12;
    setRoute(0,[0,1]);
    const points=lineTrack(0,1,0);
    const [a,b]=points.slice(-2);
    return [(a.x+b.x)/2,(a.y+b.y)/2];
  });
  const loco=await page.getByRole('button',{name:'增加机车'}).boundingBox();
  await dragThrough([{x:loco.x+loco.width/2,y:loco.y+loco.height/2},await world(drop)]);
  check(await page.evaluate(() => trains.length===2 && distance(trainPose(trains[1]),stations[1])<2 &&
    trains[1].direction===-1 && trains[1].progress===0 && inventory.trains===1),'locomotive departs from the nearer station toward the drop');
  await page.evaluate(() => {trains[1].cars=1;inventory.cars=1;updateHUD();});
  const wagon=await page.getByRole('button',{name:'增加车厢'}).boundingBox();
  await dragThrough([{x:wagon.x+wagon.width/2,y:wagon.y+wagon.height/2},await station(1)]);
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
    start('London','normal');paused=true;inventory.crossings=12;
    stations=[[230,150],[520,150],[230,400]].map(([x,y],type) =>
      ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
    setRoute(0,[0,1,2,0]);
  });
  const trainButton=await page.getByRole('button',{name:'增加机车'}).boundingBox();
  const trainPickup={x:trainButton.x+trainButton.width/2,y:trainButton.y+trainButton.height/2};
  await dragThrough([trainPickup,await world([300,150])]);
  await dragThrough([trainPickup,await world([230,215])]);
  check(await page.evaluate(() => trains.length===3 &&
    trains[1].stop===0 && trains[1].direction===1 && trains[1].progress===0 &&
    trains[2].stop===0 && trains[2].direction===-1 && trains[2].progress===0 && inventory.trains===0),
    'dropping a locomotive on either side of a loop station selects opposite departures');
  await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;setRoute(0,[0,1,2]);phase='ended';showResult();
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
    Object.assign(lead,{stop:0,direction:1,progress:55+22+railcarSpacing+5,cars:1});
    Object.assign(following,{stop:0,direction:1,progress:55,velocity:trainTuning.speed});
    const route=lines[0], spacing=trainSpacing(following,route);
    advanceTrain(following,lineTrack(0,1,0),.1,spacing.room);
    return Math.abs(lead.progress-following.progress-(22+railcarSpacing))<1e-6;
  }),'a moving follower brakes behind the last carriage');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;
    const first=cameraView(800,600,0).scale, last=cameraView(800,600,dayDuration+960).scale;
    cityKey='Paris';const paris=cameraView(800,600,dayDuration+960).scale/cameraView(800,600,0).scale;cityKey='London';
    if (Math.abs(last/first-.5/1.36)>1e-9 || Math.abs(paris-1/1.36)>1e-9) return false;
    time=dayDuration+960;updateCamera();
    for (let i=0;i<40;i++) {
      const spot=findStationPosition();
      if (!spot || waterDistance(spot,cities.London)<30 || !londonGrid.some(cell => cell.x===spot.x && cell.y===spot.y)) return false;
      stations.push({...spot,type:0,waiting:[],pressure:0,capacity:6,born:-1});
    }
    return true;
  }),'London camera ends at half zoom and new stations land on map grid points away from the river');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;time=dayDuration+960;updateCamera();
    // 方形站只出现在有方形权重的区域，特殊站不出现在没有特殊权重的区域
    for (let i=0;i<60;i++) {
      for (const type of [0,1,2,3,5]) {
        const spot=findLondonStation(type);
        if (!spot) continue;
        const weights=londonMap.areas.filter((_,area) => londonGrid.some(c => c.x===spot.x && c.y===spot.y && c.area===area));
        if (!weights.some(area => area.w[Math.min(type,3)]>0 && area.scale===spot.centrality)) return false;
      }
    }
    const crowded=stations[0];crowded.centrality=3;stations.slice(1).forEach(s => {s.centrality=0;});
    for (let i=0;i<40;i++) {crowded.waiting=[];spawnPassenger();if (!crowded.waiting.length) return false;}
    return true;
  }),'London station spots follow each map area shape weights and passengers follow its density');
  const barSpot=await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;setRoute(0,[0,1]);
    const [head,tail]=terminatorStubs(lines[0]);
    return {tail:[tail.x,tail.y],far:[tail.x+60,tail.y+60],head:[head.x,head.y]};
  });
  check(await page.evaluate(({tail,far,head}) => terminatorAt({x:tail[0],y:tail[1]})?.id===1 && terminatorAt({x:head[0],y:head[1]})?.id===0 &&
    !terminatorAt({x:far[0],y:far[1]}),barSpot),'line terminators are grabbable near the bar and not far away');
  await dragThrough([await world(barSpot.tail),await station(2)]);
  check(await page.evaluate(() => lines[0].join()==='0,1,2'),'dragging the terminator bar extends the line');
  await dragThrough([await world(await page.evaluate(() => {const [h]=terminatorStubs(lines[0]);return [h.x,h.y];})),await station(1)]);
  check(await page.evaluate(() => lines[0].join()==='1,2'),'dragging the terminator bar back over a station shortens the line');
  await dragThrough([await station(2),await station(0)]);
  check(await page.evaluate(() => lines[0].join()==='1,2' && lines[1].join()==='2,0'),
    'dragging from the center of a served terminal starts a new line when a slot is available');
  await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;
    stations=[[240,155],[410,155],[570,250],[570,410]].map(([x,y],type) =>
      ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
    setRoute(0,[0,1]);setRoute(1,[1,2]);setRoute(2,[0,2]);
  });
  await dragThrough([await station(3),await station(2)]);
  check(await page.evaluate(() => lines[0].join()==='0,1' && lines[1].join()==='1,2,3' &&
    lines[2].join()==='0,2'),'dragging a new station to a terminus extends an existing line when all slots are used');
  const parallelRail=await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;
    stations=[[240,155],[570,155],[405,265]].map(([x,y],type) =>
      ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
    setRoute(0,[0,1]);setRoute(1,[0,1]);
    const path=lineTrack(0,1,1);
    return [(path[1].x+path.at(-2).x)/2,(path[1].y+path.at(-2).y)/2];
  });
  await dragThrough([await world(parallelRail),await station(2)]);
  check(await page.evaluate(() => lines[0].join()==='0,1' && lines[1].join()==='0,2,1' && selected===1),
    'dragging an adjacent unselected track edits the actual track under the pointer');
  const bendGesture=await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;
    stations=[[230,150],[520,260],[235,430]].map(([x,y],type) =>
      ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
    setRoute(0,[0,1,2,0]);
    trains[0].progress=25;
    trains[0].riders=[passenger(2)];
    return {before:JSON.stringify(lineTrack(0,1,0)),other:JSON.stringify(lineTrack(1,2,0))};
  });
  const bendFrom=await world([380,260]), bendTo=await world([380,150]);
  await page.mouse.move(bendFrom.x,bendFrom.y);
  await page.mouse.down();
  await page.mouse.move(bendTo.x,bendTo.y);
  check(await page.evaluate(() => Boolean(drag?.bend)),'the alternate bend is previewed before release');
  await page.mouse.up();
  check(await page.evaluate(({before,other}) => lines[0].join()==='0,1,2,0' &&
    JSON.stringify(lineTrack(0,1,0))!==before && JSON.stringify(lineTrack(1,2,0))===other &&
    trains[0].riders[0].type===2 && trains[0].progress>0 && retiring.length===0 &&
    JSON.stringify(linkPaths(replayFrames.at(-1).lines[0],replayFrames.at(-1).stations).forward[0])!==before,bendGesture),
    'dragging a bend changes only its geometry and keeps the loop, train and replay intact');
  await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;
    stations=[[230,150],[520,150],[520,390],[230,390]].map(([x,y],type) =>
      ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
    setRoute(0,[0,1,2,3,0]);setRoute(1,[1,2]);
    Object.assign(trains[0],{progress:20,dwell:0});
  });
  const removeFrom=await world([380,150]), removeAt=await station(1);
  await page.mouse.move(removeFrom.x,removeFrom.y);
  await page.mouse.down();
  await page.mouse.move(removeAt.x,removeAt.y);
  check(await page.evaluate(() => drag?.removing && drag.draft.join()==='0,2,3,0'),
    'dragging a ring segment to its adjacent station previews removal');
  const removeAway=await world([400,270]);
  await page.mouse.move(removeAway.x,removeAway.y);
  check(await page.evaluate(() => drag?.removing),'moving away keeps the cumulative station removal preview');
  await page.mouse.move(removeFrom.x,removeFrom.y);
  await page.mouse.up();
  check(await page.evaluate(() => lines[0].join()==='0,1,2,3,0'),'returning to the press point cancels the station removal preview');
  await dragThrough([removeFrom,removeAt]);
  check(await page.evaluate(() => lines[0].join()==='0,2,3,0' && lines[1].join()==='1,2' && stations.length===4),
    'dropping on the adjacent station removes only its stop on the edited line and keeps the loop');
  check(await page.evaluate(() => {
    if (retiring.length!==1 || retiring[0].removedTracks.map(track => edgeKey(track.from,track.to)).join()!=='0/1,1/2') return false;
    for (let i=0;i<600 && retiring.length;i++) moveTrains(.05);
    return retiring.length===0;
  }),'both old links stay visible for the retiring train and clear after it finishes');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;
    stations=[[100,100,0],[300,200,1],[500,300,2]].map(([x,y,type]) => ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
    setRoute(0,[0,1,2]);
    const second=lineTrack(1,2,0), first=lineTrack(0,1,0);
    // 第一段以水平线进入车站 1，第二段也应先走水平线而不是斜线
    const entering=first.at(-1).y-first.at(-2).y;
    cityKey='London';
    return Math.abs(entering)<1e-6 && Math.abs(second[1].y-200)<1e-6 && Math.abs(second.at(-1).x-500)<1e-6;
  }),'a new link continues straight from the incoming direction instead of turning early');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;
    nextStation=Infinity;nextPassenger=Infinity;
    for (let i=0;i<170;i++) simulate(.05);
    const idle=stations.map(s => s.idle);
    setRoute(0,[0,1]);simulate(.05);
    return idle.every(value => value>=unconnectedWarning && value<9) && stations[0].idle===0 && stations[1].idle===0 && stations[2].idle>8;
  }),'stations unconnected for 8 seconds are flagged and reset when a line reaches them');
  check(await page.evaluate(() => {
    start('London','normal');
    return nextStation===14 && spawnSchedules.every(schedule => schedule.gap===28);
  }),'first new station arrives after the first schedule gap');
  check(await page.evaluate(() => {
    const point={x:width/2,y:274}, londonSpacing=stationSeparationAt(point), londonFirst=nextStation;
    start('Paris','normal');paused=true;
    if (nextStation>=londonFirst || stationSeparationAt(point)>=londonSpacing ||
      !stations.every(station => station.capacity===4)) return false;
    spawnStation({x:250,y:180});
    if (stationGap>=28 || stations.at(-1).capacity!==4) return false;
    nextStation=nextPassenger=Infinity;
    const station=stations[0];
    station.waiting=Array.from({length:4},() => passenger(1));
    simulate(overloadGrace+.1);
    if (station.pressure!==0) return false;
    station.waiting.push(passenger(1));
    simulate(overloadGrace+.1);
    if (station.pressure<=0) return false;
    inventory.interchanges=1;placeInterchange(0);
    start('Paris','creative');creativePointer({x:250,y:150},-1);
    $('screen').close();
    return station.capacity===18 && stations.length===4 && stations.at(-1).capacity===4;
  }),'Paris has smaller stations, closer and faster spawns, and standard interchange capacity');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;
    nextStation=nextPassenger=Infinity;
    setRoute(0,[0,1]);
    const station=stations[0], other=stations[2], train=trains[0];
    for (const stop of [station,other]) {
      stop.waiting=Array.from({length:9},() => passenger(stop.type===1 ? 2 : 1));
      stop.pressure=10;stop.over=8;
    }
    train.stop=0;train.dwell=1;
    simulate(.1);
    if (station.pressure!==10 || station.over!==8 || other.pressure<=10) return false;
    train.dwell=0;
    simulate(.1);
    if (Math.abs(station.pressure-10.1)>1e-8) return false;
    station.waiting.length=0;
    Object.assign(train,{dwell:1,progress:0});
    const previous=station.pressure;
    simulate(.1);
    return Math.abs(station.pressure-(previous-.1))<1e-8;
  }),'a stopped train pauses the crowding timer and recovery matches accumulation speed');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;nextStation=nextPassenger=Infinity;
    const [urgent,regular]=stations;
    for (const station of [urgent,regular]) {
      station.waiting=Array.from({length:7},() => passenger(1));
      station.over=10;
    }
    urgent.pressure=44;regular.pressure=20;
    upgrade();$('screen').close();
    if (urgent.expiryLimit!==49 || regular.expiryLimit!==undefined || urgent.pressure!==44) return false;
    simulate(2);
    if (phase!=='play' || urgent.pressure!==46 || regular.pressure!==22) return false;
    urgent.waiting.length=0;
    simulate(1);
    if (urgent.pressure!==44 || urgent.expiryLimit!==undefined) return false;
    urgent.waiting=Array.from({length:7},() => passenger(1));
    simulate(1);
    const ended=phase==='ended' && collapseStation===urgent;
    $('screen').close();
    return ended;
  }),'the new week guarantees five remaining seconds only for critical stations and preserves pressure');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;inventory.lines=3;
    stations=[[100,100,0],[300,200,1],[500,300,2],[100,300,0]].map(([x,y,type]) => ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
    setRoute(0,[0,1]);setRoute(1,[3,0,1]);
    const first=lineTrack(0,1,0), second=lineTrack(0,1,1);
    // 第二条线从下方进入车站 0，先走水平线；第一条无进入方向，先走斜线。两条走法不同，不画成偏移平行线
    return Math.abs(second[1].y-100)<1e-6 && Math.abs(first[1].y-100)>1 && JSON.stringify(first)!==JSON.stringify(second);
  }),'lines over the same stations take their own bends unless they match exactly');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;time=10;lastTouch=8;
    if (currentTips().length) return false;
    lastTouch=2;
    const build=currentTips();
    if (build.length!==2 || build[0].side!==-1 || build[1].side!==1 || !build[0].text.includes('拖动')) return false;
    setRoute(0,[0,1]);stations[2].idle=12;lastTouch=0;time=30;
    const extend=currentTips();
    if (extend.length!==2 || !(extend[0].text.includes('手柄') || extend[0].text.includes('这条线')) || extend[1].point!==stations[2]) return false;
    stations[2].idle=3;
    return currentTips().length===0;
  }),'tips appear after idle time: build a line first, then extend to an unconnected station');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;inventory.crossings=12;
    stations=[[100,300,0],[500,300,1],[300,360,2]].map(([x,y,type]) => ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1,idle:0}));
    setRoute(0,[0,1]);stations[2].idle=12;time=30;lastTouch=0;
    const tips=currentTips();
    return tips.length===2 && tips[0].handle===true && tips[0].text.includes('这条线') && Math.abs(tips[0].point.x-300)<1e-6 && Math.abs(tips[0].point.y-300)<1;
  }),'a station beside a line shows the drag-this-line tip with the handle on the nearest point');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;
    if (inventory.crossings!==3) return false;
    inventory.crossings=0;
    const accepted=setRoute(0,[0,1]);
    return accepted===false && feedback.includes('过河通道已用完') && performance.now()<feedbackUntil;
  }),'London starts with three tunnels and a missing tunnel shows the original message');
  check(await page.evaluate(() => {
    start('London','normal');paused=true;score=12;time=45;newBest=true;phase='ended';showResult();
    const text=$('screen').textContent;
    const best=text.includes('12 位乘客在 2 天内乘坐了你的地铁') && text.includes('新纪录');
    newBest=false;showResult();
    const old=$('screen').textContent.includes('最高纪录');
    $('screen').close();phase='play';
    return best && old;
  }),'settlement text follows the original wording with passengers, days and record');
  const stops=await page.evaluate(() => {
    function arrive({waiting=[], riders=[], sharp=false}) {
      start('London','normal');paused=true;
      stations=[[210,165,0],[410,165,1],[sharp?320:610,sharp?176:165,2]].map(([x,y,type]) =>
        ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
      setRoute(0,[0,1,2]);
      const train=trains[0];
      stations[1].waiting=waiting.map(type => passenger(type));
      train.riders=riders.map(type => passenger(type));
      train.dwell=0;
      for(let i=0;i<500 && train.stop===0;i++) moveTrains(.025);
      if (train.stop!==1) throw new Error('train did not reach the middle station');
      const result={dwell:train.dwell,velocity:train.velocity};
      if (train.dwell>0) moveTrains(train.dwell+.001);
      return {...result,riders:train.riders.map(rider => rider.type),score,waiting:stations[1].waiting.length};
    }
    return {
      empty:arrive({}), sharp:arrive({sharp:true}), pickup:arrive({waiting:[2]}),
      reverse:arrive({waiting:[0]}), delivery:arrive({riders:[1]}),
      full:arrive({waiting:[2],riders:Array(6).fill(2)}),
    };
  });
  check(stops.empty.dwell===0 && stops.empty.velocity>0 && stops.sharp.dwell>0 && stops.sharp.velocity===0,
    'trains maintain speed through empty straight stations but stop at sharp turns');
  check(stops.pickup.dwell>0 && stops.pickup.riders.join()==='2' && stops.delivery.score===1 &&
    stops.reverse.dwell===0 && stops.reverse.waiting===1 && stops.full.dwell===0 && stops.full.waiting===1,
    'stop decision respects boarding direction, capacity and alighting: '+JSON.stringify(stops));
  check(await page.evaluate(() => {
    start('London','normal');paused=true;
    stations=[[200,175,0],[400,175,1],[600,175,2]].map(([x,y,type]) =>
      ({x,y,type,capacity:6,waiting:[],pressure:0,born:-1}));
    setRoute(0,[0,1]);addTrain(0);
    const [forward,reverse]=trains;
    Object.assign(forward,{stop:0,direction:1,progress:40,dwell:0,riders:[passenger(1)]});
    Object.assign(reverse,{stop:1,direction:-1,progress:140,dwell:0,riders:[passenger(0)]});
    const positions=trains.map(train => trainPose(train).x), stock=inventory.trains;
    spawnStation({x:300,y:175});
    return lines[0].join()==='0,3,1' && !retiring.length && inventory.trains===stock &&
      forward.riders.length===1 && reverse.riders.length===1 &&
      trains.every((train,i)=>Math.abs(trainPose(train).x-positions[i])<1) &&
      forward.stop===0 && reverse.stop===1;
  }), 'station spawned on track inserts without moving trains or losing riders');
  check(await page.evaluate(() => {
    mode='extreme';
    spawnStation({x:350,y:175});
    return stations.length===5 && lines[0].join()==='0,3,1' && !retiring.length;
  }), 'automatic infill leaves permanent extreme track untouched');
  // 回归：三座城市 × 四种模式长时间模拟并反复绘制，不应抛出异常
  check(await page.evaluate(() => {
    const rand=Math.random;
    for (const city of Object.keys(cities)) for (const mode of ['normal','endless','extreme','creative']) {
      document.getElementById('screen')?.open && document.getElementById('screen').close();
      start(city,mode);paused=true;inventory.crossings=12;
      for (let i=0;i<1600 && phase==='play';i++) {
        simulate(.15);
        if ($('screen').open) $('screen').close();
        if (i%40===0) {
          const free=lines.findIndex((route,k) => k<inventory.lines && route.length===0);
          const a=Math.floor(rand()*stations.length), b=Math.floor(rand()*stations.length);
          if (free>=0 && a!==b) setRoute(free,[a,b]);
          else {
            const k=Math.floor(rand()*inventory.lines);
            if (lines[k].length>=2 && !looped(lines[k]) && !lines[k].includes(b)) setRoute(k,[...lines[k],b]);
          }
        }
        if (i%25===0) {updateCamera();paint();currentTips();}
      }
    }
    start('London','normal');
    return true;
  }),'all cities and four modes run long simulations without errors');
  check(await page.evaluate(() => {
    const crossingsAt=city => {start(city,'normal');const n=inventory.crossings;$('screen').close();return n;};
    return crossingsAt('London')===3 && crossingsAt('NewYork')===3 && crossingsAt('Paris')===4;
  }),'Paris starts with four tunnels, London and New York with three');
  check(await page.evaluate(() => {
    const options=['carriage','tunnel','station','line'].map(symbol => ({symbol}));
    const share=city => {
      cityKey=city;
      let hits=0;
      for (let i=0;i<4000;i++) if (pickOffers(options).some(o => o.symbol==='tunnel')) hits++;
      return hits/4000;
    };
    const london=share('London'), newYork=share('NewYork');
    return Math.abs(london-.5)<.05 && newYork<london-.08;
  }),'New York offers the tunnel reward less often than other cities');
  const saved=await page.evaluate(() => {
    start('Paris','normal');
    paused=true;time=8;score=12;inventory.crossings=12;
    setRoute(0,[0,1]);setRoute(1,[1,2]);
    const diagonal=trackBetween(stations[0],stations[1],null,true);
    changeBend(0,{key:edgeKey(0,1),choice:!samePath(diagonal,lineTrack(0,1,0))});
    trains[1].progress=9;
    trains[1].riders=[passenger(2)];
    setRoute(1,[]);
    stations[0].waiting=[passenger(1)];
    nextStation=11.2;nextPassenger=10;selected=0;
    return {routes:JSON.stringify(lines),cars:trains.length,last:retiring[0].progress,frames:replayFrames.length,
      bend:JSON.stringify(lineTrack(0,1,0))};
  });
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'城市选择',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:'继续运营'}).click();
  check(await page.evaluate(saved => cityKey==='Paris' && mode==='normal' && paused && time===8 && score===12 &&
    nextStation===11.2 && nextPassenger===10 && JSON.stringify(lines)===saved.routes && trains.length===saved.cars &&
    retiring[0].progress===saved.last && retiring[0].riders[0].type===2 && stations[0].waiting[0].type===1 &&
    replayFrames.length===saved.frames && JSON.stringify(lineTrack(0,1,0))===saved.bend &&
    typeof lines[0].bends?.['0/1']==='boolean' && !localStorage.getItem(savedGameKey),saved),
    'reload resumes the last parked game with its network, retiring train, riders and timers');
  await page.evaluate(() => {
    berlinEarned=false;localStorage.removeItem('metro-city-berlin');
    for (const city of berlinSources) for (const mode of ['normal','extreme']) {
      localStorage.removeItem('metro-best-'+city+'-'+mode);
    }
    menuCity='London';menuMode='normal';showMenu();
  });
  await page.getByRole('button',{name:'柏林',exact:true}).click();
  check(await page.getByRole('button',{name:'开始游戏'}).isDisabled(),'Berlin is initially locked');
  await page.evaluate(() => {score=199;deliver(passenger(1));showMenu();});
  await page.getByRole('button',{name:'开始游戏'}).click();
  check(await page.evaluate(() => cityKey==='Berlin' && inventory.crossings===2 &&
    lines.length===7 && localStorage.getItem('metro-city-berlin')==='unlocked'),'200 deliveries unlock Berlin with two tunnels');
  await page.evaluate(() => {
    const random=Math.random;
    try {Math.random=()=>.4;upgrade();} finally {Math.random=random;}
  });
  await page.getByRole('button',{name:'机车',exact:true}).click();
  await page.getByRole('button',{name:'过河通道 ×1',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  check(await page.evaluate(() => inventory.crossings===3),'Berlin tunnel reward grants exactly one crossing');
  check(errors.length===0,errors.join(', '));
}

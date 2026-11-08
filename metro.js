'use strict';

const $ = id => document.getElementById(id);
const canvas = $('map');
let ctx = canvas.getContext('2d');
const width = 960;
const height = 570;
let paper, water, ink, colors;
let night=false;
const themes = {
  London: {
    day: {"paper": "#f0f0f0", "water": "#c5e8fa", "bank": "#64ccf5", "station": "#fafafa", "ink": "#443333", "colors": ["#fccf05", "#ed2e24", "#1c4094", "#079fdb", "#008b3b", "#f386a0", "#b05fff"]},
    night: {"paper": "#303030", "water": "#537c90", "bank": "#4c6f7f", "station": "#2e2e2e", "ink": "#dcdcdc", "colors": ["#fec909", "#e95129", "#2b61a9", "#3ca3d5", "#388931", "#f593af", "#8e552b"]},
    bankWidth: 3.72, stationWidth: 3.72,
  },
  Paris: {
    day: {"paper": "#fffded", "water": "#d4edfa", "bank": "#6dc3de", "station": "#fafafa", "ink": "#443333", "colors": ["#f1c830", "#206db3", "#9b9a40", "#bb4d98", "#f68f4d", "#76c494", "#f59eb3"]},
    night: {"paper": "#303030", "water": "#7ea7b6", "bank": "#4d7784", "station": "#2e2e2e", "ink": "#dcdcdc", "colors": ["#f1c830", "#206db3", "#9b9a40", "#bb4d98", "#f68f4d", "#76c494", "#f59eb3"]},
    bankWidth: 3.72, stationWidth: 3.72,
  },
  NewYork: {
    day: {"paper": "#f2e8d3", "water": "#9fc8eb", "bank": "#eee1c5", "station": "#fafafa", "ink": "#443333", "colors": ["#ee352e", "#00933c", "#b933ad", "#2850ad", "#ff6319", "#fccc0a", "#996633"]},
    night: {"paper": "#2e3032", "water": "#415b74", "bank": "#2b2c2c", "station": "#222424", "ink": "#d9dcdf", "colors": ["#ee352e", "#00933c", "#b933ad", "#2850ad", "#ff6319", "#fccc0a", "#996633"]},
    bankWidth: 1.24, stationWidth: 2.48,
  },
};
const cities = {
  London: {name:'伦敦', river:[[0,361],[180,338],[310,351],[430,269],[595,267],[687,327],[780,328],[960,270]], start:[[367,223],[499,344],[625,214]]},
  Paris: {name:'巴黎', river:[[0,217],[149,215],[278,265],[438,326],[565,326],[727,243],[960,260]], start:[[340,227],[477,372],[614,249]]},
  NewYork: {name:'纽约', vertical:true, river:[[0,485],[100,456],[200,419],[300,387],[400,352],[500,310],[570,279]],
    eastRiver:[[0,668],[85,630],[175,592],[255,574],[325,601],[415,524],[485,461],[570,395]], start:[[352,228],[495,329],[655,235]]},
};
const days = ['一','二','三','四','五','六','日'];
const types = ['圆形','三角形','方形','菱形','星形','五边形','十字形'];
const weekDuration = 84;
const scenicMilestones=[4,8,13,19,24,27,33,36,39,43,47,52,56,60,65,75,90];
let recentTrips, scenicMilestone, nextEfficiency;
const overloadLimit = 24;
let menuCity = 'London', menuMode = 'normal';
const modes=['normal','endless','extreme','creative'];
const modeNames={normal:'普通',endless:'无尽',extreme:'极限',creative:'创意'};
const extremeGoals={
  London:{score:1000,limit:1,label:'用至多 1 条通道送达 1,000 人',
    count:() => lines.reduce((total,route) => total+crossings(route),0)},
  Paris:{score:1300,limit:3,label:'用至多 3 条线路送达 1,300 人',
    count:() => lines.filter(route => route.length).length},
  NewYork:{score:1600,limit:2,label:'让方形站最多出现在 2 条线路上，并送达 1,600 人',
    count:() => lines.filter(route => route.some(id => stations[id].type===2)).length},
};
const unlockedExtreme=new Set();
let eligibleExtreme=true, upcomingStation;
let collapseStation = null;
let replayFrames=[], replay=null;
let lesson=null;
let history, daily;
const metrics = [
  ['dailyTrips','每日送达','#139747','人'],
  ['totalTrips','累计送达','#d72534','人'],
  ['crowding','拥挤乘客','#d66a21','人'],
  ['population','在途及候车乘客','#0875a9','人'],
  ['stations','车站','#8456a2','站'],
  ['track','轨道长度','#596978','地图单位'],
  ['tripDistance','平均乘车距离','#006e66','地图单位'],
  ['waiting','平均候车时间','#a74b76','秒'],
  ['transfers','平均换乘次数','#8a6514','次'],
  ['capacity','总运力','#3b7451','人'],
  ['used','已用运力','#505997','人'],
];
let cityKey = 'London';
let mode = 'normal';
let stations, lines, trains, inventory;
let edgeLines, retiring;
let highlightUntil = 0;
let assetDrag = null, vehicleDrag=null;
let time, nextStation, nextPassenger, week, score, paused, speed, phase, selected, drag;
let view = {x:0,y:0,scale:1};
let feedback = '';
let feedbackUntil = 0;
let lastFrame = 0;

function bestScore() {
  try { return Number(localStorage.getItem('metro-best-' + cityKey + '-' + mode)) || 0; }
  catch { return 0; }
}

function reset(key) {
  cityKey = key;
  applyNight(night);
  collapseStation = null;
  lesson=null;
  eligibleExtreme=true;
  upcomingStation=undefined;
  document.documentElement.removeAttribute('data-lesson');
  $('city').textContent = cities[key].name;
  stations = cities[key].start.map(([x,y], type) => ({x:x+Math.random()*32-16,y:y+Math.random()*12-6,type,waiting:[],pressure:0,capacity:6,born:-1}));
  lines = colors.map(() => []);
  trains = [];
  retiring = [];
  highlightUntil = 0;
  inventory = {lines:3, trains:3, cars:0, crossings:2, interchanges:0};
  if (mode==='creative') enableCreative();
  time = score = selected = 0;
  recentTrips=[];
  scenicMilestone=0;
  nextEfficiency=scenicMilestones[0];
  history=[];
  daily={trips:0, distance:0, waiting:0, transfers:0};
  sampleStatistics();
  nextStation = 16;
  nextPassenger = 3;
  week = speed = 1;
  paused = false;
  phase = 'play';
  drag = assetDrag = vehicleDrag = null;
  feedback = '';
  feedbackUntil = 0;
  $('interchange').setAttribute('aria-pressed','false');
  $('creativeEdit').setAttribute('aria-pressed','false');
  $('time').hidden=true;
  $('clock').setAttribute('aria-expanded','false');
  rebuildTracks();
  replayFrames=[];
  recordReplay();
  updateLines();
  updateHUD();
}

function waterways(city) { return city.eastRiver ? [city.river,city.eastRiver] : [city.river]; }

function riverY(x,river) {
  for (let i = 1; i < river.length; i++) {
    const [bx, by] = river[i];
    if (x <= bx) {
      const [ax, ay] = river[i-1];
      return ay + (by - ay) * Math.max(0,x-ax) / (bx - ax);
    }
  }
  return river.at(-1)[1];
}

function riverCoordinates(point,city) {
  return city.vertical ? {x:point.y,y:point.x} : point;
}

function pathBetween(a,b) {
  if (a.x > b.x || (a.x === b.x && a.y > b.y)) return pathBetween(b,a).reverse();
  const dx = b.x-a.x, dy = b.y-a.y;
  const diagonal = Math.min(Math.abs(dx),Math.abs(dy));
  const bend = {x:a.x + Math.sign(dx)*diagonal, y:a.y + Math.sign(dy)*diagonal};
  return [a,bend,b];
}

function looped(route) {
  return route.length >= 4 && route[0] === route.at(-1);
}

function routeSize(route) { return route.length - Number(looped(route)); }

function stepIndex(route, stop, direction) {
  const size = routeSize(route);
  return looped(route) ? (stop+direction+size)%size : stop+direction;
}

function crossings(route) {
  const city=cities[cityKey];
  let total = 0;
  for (let i=1;i<route.length;i++) {
    const points=trackBetween(stations[route[i-1]],stations[route[i]]).map(p => riverCoordinates(p,city));
    for (const river of waterways(city)) {
      for (let k=1;k<points.length;k++) {
        const from=points[k-1], to=points[k];
        const breaks=river.map(([x]) => x).filter(x => x>Math.min(from.x,to.x) && x<Math.max(from.x,to.x));
        if (from.x>to.x) breaks.reverse();
        const signs=[from.y>=riverY(from.x,river),...breaks.map(x =>
          from.y+(to.y-from.y)*(x-from.x)/(to.x-from.x)>=riverY(x,river)),to.y>=riverY(to.x,river)];
        for (let j=1;j<signs.length;j++) if (signs[j]!==signs[j-1]) total++;
      }
    }
  }
  return total;
}

function edgeKey(a,b) { return Math.min(a,b)+'/'+Math.max(a,b); }

function indexTracks(routes) {
  const edges=new Map();
  routes.forEach((route,line) => {
    for (let i=1;i<route.length;i++) {
      const key=edgeKey(route[i-1],route[i]);
      const group=edges.get(key) ?? [];
      group.push(line);
      edges.set(key,group);
    }
  });
  return edges;
}

function rebuildTracks() {
  edgeLines=indexTracks(lines);
  trains.forEach(train => {delete train.approach;});
}

function notify(message) {
  feedback = message;
  feedbackUntil = performance.now() + 4000;
  updateHUD();
}

function usedCrossings(replace=-1, replacement=[], pending=retiring) {
  return lines.reduce((total, old, line) => {
    const route=line===replace ? replacement : old;
    const occupied = new Set();
    for (let i=1;i<route.length;i++) occupied.add(edgeKey(route[i-1],route[i]));
    total+=crossings(route);
    for (const train of pending) {
      if (train.line!==line) continue;
      const key=edgeKey(train.from,train.to);
      if (occupied.has(key)) continue;
      occupied.add(key);
      total+=crossings([train.from,train.to]);
    }
    return total;
  },0);
}

function passenger(type) {
  return {type, queuedAt:time, waiting:0, distance:0, boardings:0};
}

function deliver(rider) {
  score++;
  recentTrips.push(time);
  daily.trips++;
  daily.distance+=rider.distance;
  daily.waiting+=rider.waiting;
  daily.transfers+=Math.max(0,rider.boardings-1);
}

function queueAt(rider,station) {
  rider.queuedAt=time;
  station.waiting.push(rider);
}

function unloadRiders(riders,id) {
  const station=stations[id];
  for (const rider of riders) {
    if (rider.type===station.type) deliver(rider);
    else queueAt(rider,station);
  }
}

function unload(train,id) {
  unloadRiders(train.riders,id);
  train.riders=[];
}

function returnStock(train) {
  inventory.trains++;
  inventory.cars+=train.cars;
}

function dispatchIfEmpty(line) {
  if (lines[line].length && !trains.some(t => t.line===line) && inventory.trains) addTrain(line);
}

function setRoute(index, route) {
  if (route.length<2) route=[];
  const old=lines[index];
  if (mode==='extreme' && old.length) {
    const offset=route.indexOf(old[0]);
    const keepsTrack=offset>=0 && old.every((id,i) => route[offset+i]===id);
    if (!keepsTrack || (looped(old) && route.length!==old.length)) {
      notify('极限模式下轨道一经铺设，只能从端点延长');
      return false;
    }
  }
  const assignments=trains.filter(t => t.line===index).map(train => {
    const from=old[train.stop], to=old[stepIndex(old,train.stop,train.direction)];
    const stop=route.indexOf(from), next=route.indexOf(to);
    const direction=stop>=0 && next>=0
      ? [train.direction,-train.direction].find(dir => stepIndex(route,stop,dir)===next)
      : undefined;
    return {train,from,to,stop,direction};
  });
  const deferred=assignments.filter(({train,direction}) => !direction && train.progress>0).map(({train,from,to}) => ({
    ...train, from, to, points:lineTrack(from,to,index),
  }));
  const pending=retiring.concat(deferred);
  if (usedCrossings(index,route,pending)>inventory.crossings) {
    notify('过河通道不足。等旧车驶离后再试，或选择其他走向');
    return false;
  }
  retiring=pending;
  for (const {train,from,stop,direction} of assignments) {
    if (direction) {
      train.stop=stop;
      train.direction=direction;
      continue;
    }
    if (!train.progress) unload(train,from);
    if (!train.progress && stop>=0 && route.length) {
      train.stop=stop;
      if (!looped(route)) {
        if (stop===0) train.direction=1;
        if (stop===route.length-1) train.direction=-1;
      }
      train.velocity=0;
      train.dwell=.55;
      continue;
    }
    if (!train.progress) returnStock(train);
    trains.splice(trains.indexOf(train),1);
  }
  lines[index]=route;
  rebuildTracks();
  recordReplay();
  dispatchIfEmpty(index);
  highlightUntil=performance.now()+1500;
  updateLines();
  updateHUD();
  return true;
}

function trainLimit() {return mode==='creative' ? 8 : 11-colors.length;}

function enableCreative() {
  Object.assign(inventory,{lines:colors.length,trains:Infinity,cars:Infinity,crossings:Infinity,interchanges:Infinity});
  stations.forEach(station => {station.demand ??=1;});
}

function removeCreativeStation(id) {
  // Convert the affected paths before remapping station indices.
  lines.forEach((route,line) => {
    if (!route.includes(id)) return;
    for (const train of trains) {
      if (train.line===line && route[train.stop]===id && !train.progress) {
        unload(train,route[stepIndex(route,train.stop,train.direction)]);
      }
    }
    const wasLoop=looped(route);
    const updated=(wasLoop ? route.slice(0,-1) : route).filter(station => station!==id);
    if (wasLoop && updated.length>=3) updated.push(updated[0]);
    setRoute(line,updated);
  });
  retiring=retiring.filter(train => {
    if (train.from!==id && train.to!==id) return true;
    unload(train,train.to===id ? train.from : train.to);
    returnStock(train);
    return false;
  });
  stations.splice(id,1);
  lines=lines.map(route => route.map(station => station>id ? station-1 : station));
  retiring.forEach(train => {
    if (train.from>id) train.from--;
    if (train.to>id) train.to--;
  });
  rebuildTracks();
  recordReplay();
  lines.forEach((_,line) => dispatchIfEmpty(line));
  updateLines();
  updateHUD();
}

function editCreativeStation(id) {
  const station=stations[id];
  const shapes=['○','△','□','◇','☆','⬠','✚'];
  showPanel('编辑车站','选择站形，并设置该站产生乘客的频率。',[
    ...types.map((name,type) => [shapes[type]+' '+name,() => {
      station.type=type;
      station.waiting=station.waiting.filter(rider => rider.type!==type);
      recordReplay();
      editCreativeStation(id);
    }]),
    ['客流：'+['停用','低','中','高'][station.demand ?? 1],() => {
      station.demand=((station.demand ?? 1)+1)%4;
      editCreativeStation(id);
    }],
    ['删除车站',() => {removeCreativeStation(id);$('screen').close();}],
    ['完成',() => $('screen').close()],
  ],'创意模式','creative');
  $('choices').children[station.type].setAttribute('aria-pressed','true');
}

function creativePointer(point,id) {
  if (id>=0) {editCreativeStation(id);return;}
  if (stations.length>=80) {notify('已达到网页创意模式的 80 站上限');return;}
  const city=cities[cityKey], position=riverCoordinates(point,city);
  if (waterways(city).some(river => Math.abs(position.y-riverY(position.x,river))<19)) {
    notify('请在陆地上放置车站');
    return;
  }
  stations.push({...point,type:0,capacity:6,waiting:[],pressure:0,born:time,demand:1});
  recordReplay();
  editCreativeStation(stations.length-1);
}

function addTrain(line,placement=null) {
  if (!inventory.trains || !lines[line].length) return;
  const existing = trains.filter(t => t.line === line).length;
  if (existing >= trainLimit()) return;
  const stop=placement ? placement.index-1 : existing%2 ? routeSize(lines[line])-1 : 0;
  const direction=placement || stop===0 ? 1 : -1;
  trains.push({line,stop,direction,progress:placement?.progress ?? 0,velocity:0,
    dwell:placement ? 0 : .6+Math.floor(existing/2)*2,riders:[],cars:0});
  inventory.trains--;
  updateHUD();
}

function addCar(line=selected,point=null) {
  const candidates=trains.filter(train => train.line===line);
  let train=candidates[0], best=Infinity;
  for (const candidate of candidates) {
    const cost=point ? distance(trainPose(candidate),point) : candidate.cars;
    if (cost<best) {train=candidate;best=cost;}
  }
  if (!train || !inventory.cars) return;
  train.cars++;
  inventory.cars--;
  updateHUD();
}

function travelSeconds(length,velocity=0) {
  const acceleration=110, braking=160, limit=96;
  const initial=Math.min(velocity,limit,Math.sqrt(2*braking*length));
  const peak=Math.min(limit,Math.sqrt((2*length+initial**2/acceleration)/(1/acceleration+1/braking)));
  const cruise=Math.max(0,length-(peak**2-initial**2)/(2*acceleration)-peak**2/(2*braking));
  return (peak-initial)/acceleration+cruise/limit+peak/braking;
}

function forecast(train,departing,legTimes) {
  const route=lines[train.line], ring=looped(route);
  const stationCount=routeSize(route);
  let {stop,direction}=train;
  const step=() => {
    stop=stepIndex(route,stop,direction);
    if (!ring && (stop===0 || stop===stationCount-1)) direction*=-1;
  };
  const spacing=train.progress===0 ? trainSpacing(train,route) : null;
  let firstDeparture=Math.max(0,train.dwell,spacing?.wait ?? 0);
  if (train!==departing && train.dwell<=0 && !spacing?.hold) {
    const track=lineTrack(route[stop],route[stepIndex(route,stop,direction)],train.line);
    firstDeparture=travelSeconds(Math.max(0,trackLength(track)-train.progress),train.velocity)+.55;
    step();
  }
  const events=[];
  let period=0;
  const count=ring ? stationCount : (stationCount-1)*2;
  for (let i=0;i<count;i++) {
    const from=route[stop];
    step();
    const to=route[stop], key=train.line+'/'+edgeKey(from,to);
    if (!legTimes.has(key)) legTimes.set(key,travelSeconds(trackLength(lineTrack(from,to,train.line))));
    const travel=legTimes.get(key);
    events.push({station:from,departure:firstDeparture+period,travel,reverses:!ring && (stop===0 || stop===stationCount-1)});
    period+=travel+.55;
  }
  return {train,events,period};
}

function passengerChoices(origin,departing=null,replaced=departing) {
  const arrivals=stations.map(() => Infinity);
  const firstTrain=stations.map(() => null);
  const settled=new Set();
  const choices=types.map(() => null);
  const departures=stations.map(() => []);
  const legTimes=new Map();
  const active=departing ? [departing,...trains.filter(train => train!==replaced)] : trains;
  for (const train of active) {
    const forecasted=forecast(train,departing,legTimes);
    forecasted.events.forEach((event,index) => departures[event.station].push({forecasted,index}));
  }
  arrivals[origin]=0;
  while (true) {
    let station=-1, earliest=Infinity;
    arrivals.forEach((arrival,id) => {
      if (!settled.has(id) && arrival<earliest) {station=id;earliest=arrival;}
    });
    if (station<0) break;
    settled.add(station);
    const {type}=stations[station];
    if (!choices[type] && station!==origin) choices[type]=firstTrain[station];
    // shortcut: linear transfer margin from the published example, calibrate against the desktop build when available.
    const ready=station===origin ? 0 : earliest+Math.max(.12,earliest*.1);
    for (const {forecasted,index} of departures[station]) {
      const {train,events,period}=forecasted;
      const {departure}=events[index];
      const repetitions=Math.max(0,Math.ceil((ready-departure)/period));
      let arrival=departure+repetitions*period;
      for (let offset=0;offset<events.length-1;offset++) {
        const leg=(index+offset)%events.length;
        const next=events[(leg+1)%events.length].station;
        arrival+=events[leg].travel;
        if (arrival+.02<arrivals[next]) {
          arrivals[next]=arrival;
          firstTrain[next]=firstTrain[station] ?? train;
        }
        if (events[leg].reverses) break;
        arrival+=.55;
      }
    }
  }
  return choices;
}

function service(train) {
  const route = lines[train.line];
  const id = route[train.stop];
  const s = stations[id];
  if (!train.riders.length && !s.waiting.length) return;
  const choices = passengerChoices(id,train);
  const useful = type => choices[type]===train;
  train.riders = train.riders.filter(rider => {
    if (rider.type===s.type) {deliver(rider);return false;}
    if (useful(rider.type)) return true;
    queueAt(rider,s);
    return false;
  });
  const capacity = 6*(1+train.cars);
  s.waiting = s.waiting.filter(rider => {
    if (train.riders.length >= capacity || !useful(rider.type)) return true;
    rider.waiting+=Math.max(0,time-rider.queuedAt);
    rider.boardings++;
    train.riders.push(rider);
    return false;
  });
}

function trainSpacing(train,route) {
  const peers=trains.filter(other => other.line===train.line && other.direction===train.direction);
  if (peers.length<2) return {hold:false,room:Infinity};
  const trainOrder=peers.indexOf(train);
  const length=route.slice(1).reduce((total,id,i) => total+trackLength(lineTrack(route[i],id,train.line)),0);
  const spacing=Math.min(100,length/peers.length*.35);
  let ahead=Infinity,room=Infinity;
  let stop=train.stop, traveled=-train.progress;
  for (let i=0;i<routeSize(route);i++) {
    const next=stepIndex(route,stop,train.direction);
    if (next<0 || next>=routeSize(route)) break;
    const leg=trackLength(lineTrack(route[stop],route[next],train.line));
    for (const [order,other] of peers.entries()) {
      if (other===train || other.stop!==stop) continue;
      const gap=traveled+other.progress;
      if (gap<0 || (gap===0 && order>trainOrder)) continue;
      ahead=Math.min(ahead,gap);
      if (i===0) {
        const tail=Math.min(22+other.cars*19,leg*.5,length/peers.length*.65);
        room=Math.min(room,Math.max(0,gap-tail));
      }
    }
    traveled+=leg;
    if (traveled>spacing && i>0) break;
    stop=next;
  }
  return {hold:train.progress===0 && ahead<spacing,room,wait:Math.max(0,(spacing-ahead)/45)};
}

function needsStationStop(train,route,next,incoming) {
  if (train.move || (!looped(route) && (next===0 || next===route.length-1))) return true;
  const id=route[next], station=stations[id];
  const outgoing=lineTrack(id,route[stepIndex(route,next,train.direction)],train.line);
  const before=incoming.at(-2), after=outgoing[1];
  const dot=(station.x-before.x)*(after.x-station.x)+(station.y-before.y)*(after.y-station.y);
  if (dot<-.001) return true;
  if (train.riders.some(rider => rider.type===station.type)) return true;
  const capacity=6*(1+train.cars);
  if (!train.riders.length && !station.waiting.length) return false;
  const arrival={...train,stop:next,dwell:0,progress:0,velocity:0};
  const choices=passengerChoices(id,arrival,train);
  return train.riders.some(rider => choices[rider.type]!==arrival) ||
    (train.riders.length<capacity && station.waiting.some(rider => choices[rider.type]===arrival));
}

function advanceTrain(train,points,dt,room=Infinity,through=false) {
  const remaining=trackLength(points)-train.progress;
  const target=through ? 96 : Math.min(96,Math.sqrt(2*160*Math.max(0,remaining)));
  train.velocity=Math.min(target,train.velocity+110*dt);
  const step=Math.min(room,train.velocity*dt);
  if (step<train.velocity*dt) train.velocity=step/dt;
  train.progress+=step;
  const arrived=remaining-step<=.8;
  const traveled=Math.max(0,arrived ? remaining : step);
  for (const rider of train.riders) rider.distance+=traveled;
  return arrived;
}

function moveTrains(dt) {
  for (const train of trains) {
    const route=lines[train.line];
    if (train.dwell>0) {
      train.dwell-=dt;
      if (train.dwell<=0) service(train);
      continue;
    }
    const spacing=trainSpacing(train,route);
    if (spacing.hold) {train.velocity=0;continue;}
    const next=stepIndex(route,train.stop,train.direction);
    const incoming=lineTrack(route[train.stop],route[next],train.line);
    if (train.approach===undefined && trackLength(incoming)-train.progress<38) {
      train.approach=needsStationStop(train,route,next,incoming);
    }
    const through=train.approach===false && !train.move;
    if (!advanceTrain(train,incoming,dt,spacing.room,through)) continue;
    const stopping=!through || needsStationStop(train,route,next,incoming);
    train.stop=next;
    delete train.approach;
    train.progress=0;
    if (!stopping) continue;
    if (!looped(route) && (next===0 || next===route.length-1)) train.direction*=-1;
    train.velocity=0;
    train.dwell=.55;
    applyVehicleMove(train);
  }
  const completed=retiring.filter(train => advanceTrain(train,train.points,dt));
  if (!completed.length) return;
  retiring=retiring.filter(train => !completed.includes(train));
  for (const train of completed) {
    unload(train,train.to);
    const route=lines[train.line];
    const stop=route.indexOf(train.to);
    if (stop<0 || trains.filter(t => t.line===train.line).length>=trainLimit()) {
      returnStock(train);
      continue;
    }
    trains.push({line:train.line,stop,direction:!looped(route) && stop===route.length-1 ? -1 : 1,
      cars:train.cars,riders:[],progress:0,velocity:0,dwell:.55});
  }
  lines.forEach((_,index) => dispatchIfEmpty(index));
  updateHUD();
}

function distance(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }

function trackBetween(a,b) {
  const [,bend] = pathBetween(a,b);
  const first = distance(a,bend), last = distance(bend,b);
  const radius = Math.min(12,first/2,last/2);
  if (!radius) return [a,b];
  const start = {x:bend.x+(a.x-bend.x)*radius/first,y:bend.y+(a.y-bend.y)*radius/first};
  const end = {x:bend.x+(b.x-bend.x)*radius/last,y:bend.y+(b.y-bend.y)*radius/last};
  return [a,start,...[.25,.5,.75].map(t => {
    const u = 1-t;
    return {x:u*u*start.x+2*u*t*bend.x+t*t*end.x,y:u*u*start.y+2*u*t*bend.y+t*t*end.y};
  }),end,b];
}

function lineTrack(from,to,line,mapStations=stations,mapEdges=edgeLines) {
  const a=mapStations[from], b=mapStations[to];
  const points=trackBetween(a,b);
  const group=mapEdges.get(edgeKey(from,to));
  if (!group || group.length<2) return points;
  const offset=(group.indexOf(line)-(group.length-1)/2)*7.7*Math.sign(to-from);
  const length=distance(a,b);
  const dx=(a.y-b.y)/length*offset, dy=(b.x-a.x)/length*offset;
  const shoulder = (end,next) => {
    const fraction=Math.min(14/distance(end,next),.45);
    return {x:end.x+(next.x-end.x)*fraction+dx,y:end.y+(next.y-end.y)*fraction+dy};
  };
  return [a,shoulder(a,points[1]),...points.slice(1,-1).map(p => ({x:p.x+dx,y:p.y+dy})),
    shoulder(b,points.at(-2)),b];
}

function trackLength(points) {
  return points.slice(1).reduce((total,p,i) => total+distance(points[i],p),0);
}

function findStationPosition() {
  if (stations.length>=40) return null;
  const city=cities[cityKey];
  const spread=Math.min(1,.57+time/360);
  for (let i=0;i<120;i++) {
    const x=480+(Math.random()-.5)*748*spread, y=274+(Math.random()-.5)*323*spread;
    const point=riverCoordinates({x,y},city);
    if (waterways(city).some(river => Math.abs(point.y-riverY(point.x,river))<29) ||
      stations.some(s => distance(s,{x,y})<57)) continue;
    return {x,y};
  }
  return null;
}

function spawnStation(position) {
  if (!position) return;
  const type=stations.length>=7 && stations.length%4===3
    ? Math.min(types.length-1,3+Math.floor((stations.length-7)/4))
    : Math.floor(Math.random()*3);
  stations.push({...position,type,waiting:[],pressure:0,capacity:6,born:time});
  recordReplay();
}

function spawnPassenger() {
  const candidates=mode==='endless' ? stations.filter(s => s.waiting.length<s.capacity*2) : stations;
  if (!candidates.length) return;
  let station=candidates[Math.floor(Math.random()*candidates.length)];
  if (mode==='creative') {
    const weights=candidates.map(s => s.waiting.length<s.capacity*2 ? s.demand ?? 1 : 0);
    let draw=Math.random()*weights.reduce((total,weight) => total+weight,0);
    station=candidates.find((_,i) => (draw-=weights[i])<0);
    if (!station) return;
  }
  const s=station;
  const alternatives = [...new Set(stations.map(station => station.type))].filter(type => type !== s.type);
  if (alternatives.length) s.waiting.push(passenger(alternatives[Math.floor(Math.random()*alternatives.length)]));
}

function rewardIcon(symbol,count=1,color='') {
  const icon=document.createElement('span');
  icon.className='reward-icon';
  if (color) icon.style.background=color;
  if (symbol) {
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    const use=document.createElementNS(ns,'use');
    use.setAttribute('href','#'+symbol);
    svg.append(use);
    icon.append(svg);
  }
  if (count>1) {
    const amount=document.createElement('span');
    amount.className='reward-count';
    amount.textContent=count;
    icon.append(amount);
  }
  icon.setAttribute('aria-hidden','true');
  return icon;
}

async function animateReward(icon,target) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !target) return;
  const from=icon.getBoundingClientRect(), to=target.getBoundingClientRect();
  if (!from.width || !to.width) return;
  const flying=icon.cloneNode(true);
  flying.classList.add('reward-flight');
  Object.assign(flying.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});
  $('screen').append(flying);
  try {
    const dx=to.left+to.width/2-from.left-from.width/2;
    const dy=to.top+to.height/2-from.top-from.height/2;
    await flying.animate([
      {transform:'translate(0,0) scale(1)'},
      {transform:'translate('+dx+'px,'+dy+'px) scale('+to.width/from.width+')'},
    ],{duration:430,easing:'cubic-bezier(.3,.05,.7,1)'}).finished.catch(() => {});
  } finally {
    flying.remove();
  }
}

function upgrade() {
  week++;
  const options = [
    {label:'增配车厢',description:'加挂一节车厢，多载 6 位乘客。',symbol:'carriage',target:$('car'),apply:() => {inventory.cars++;}},
    {label:'过河通道 ×2',description:'增建两条可穿越水域的轨道。',symbol:'tunnel',count:2,target:$('crossings'),apply:() => {inventory.crossings+=2;}},
    {label:'换乘站',description:'将一座车站的容量从 6 提升到 18。',symbol:'station',target:$('interchange'),apply:() => {inventory.interchanges++;}},
  ];
  if (inventory.lines<colors.length) options.push({
    label:'新增线路',description:'解锁一种颜色，开通一条新线路。',color:colors[inventory.lines],
    target:$('lines').children[inventory.lines],apply:() => {inventory.lines++;},
  });
  const offers=[];
  for (let i=0;i<2;i++) offers.push(options.splice(Math.floor(Math.random()*options.length),1)[0]);
  const claim=async (offer,button) => {
    if (button.disabled) return;
    for (const item of $('choices').children) item.disabled=true;
    await animateReward(button.querySelector('.reward-icon'),offer.target);
    inventory.trains++;
    offer.apply();
    updateLines();
    updateHUD();
    $('screen').close();
  };
  showPanel('第 '+week+' 周','本周配发一台机车。再选择一项升级。',offers.map(offer => [
    offer.label,event => claim(offer,event.currentTarget),
  ]),'','upgrade');
  [...$('choices').children].forEach((button,i) => {
    const offer=offers[i];
    button.setAttribute('aria-label',offer.label);
    const title=document.createElement('strong');
    title.textContent=offer.label;
    const detail=document.createElement('span');
    detail.className='reward-description';
    detail.textContent=offer.description;
    button.replaceChildren(rewardIcon(offer.symbol,offer.count,offer.color),title,detail);
  });
}

function sampleStatistics() {
  const active=trains.concat(retiring);
  const used=active.reduce((n,train) => n+train.riders.length,0);
  const track=lines.reduce((total,route,line) => {
    for (let i=1;i<route.length;i++) total+=trackLength(lineTrack(route[i-1],route[i],line));
    return total;
  },0);
  const trips=Math.max(1,daily.trips);
  history.push({
    time, dailyTrips:daily.trips,totalTrips:score,
    crowding:stations.reduce((n,s) => n+Math.max(0,s.waiting.length-s.capacity),0),
    population:used+stations.reduce((n,s) => n+s.waiting.length,0),
    stations:stations.length,track,tripDistance:daily.distance/trips,waiting:daily.waiting/trips,
    transfers:daily.transfers/trips,capacity:active.reduce((n,train) => n+6*(1+train.cars),0),used,
  });
  daily={trips:0,distance:0,waiting:0,transfers:0};
}

function scenicEfficiency() {
  return recentTrips.length/7;
}

function awardScenicMilestones() {
  const efficiency=scenicEfficiency();
  let awarded=false;
  while (efficiency>=nextEfficiency) {
    inventory.trains++;
    // shortcut: rotate bonus assets, replace with the per-map reward schedule when recovered.
    const bonus=['lines','cars','crossings','interchanges'][scenicMilestone%4];
    const asset=bonus==='lines' && inventory.lines===colors.length ? 'cars' : bonus;
    inventory[asset]+=asset==='crossings' ? 2 : 1;
    scenicMilestone++;
    nextEfficiency=scenicMilestones[scenicMilestone] ?? nextEfficiency+15;
    awarded=true;
  }
  if (awarded) {
    updateLines();
    notify('达到客运效率里程碑，已发放新资源');
  }
}

function paintPhoto(framed) {
  paint(true);
  const photo=$('photoPreview');
  photo.width=canvas.width;
  photo.height=canvas.height;
  const image=photo.getContext('2d');
  const w=photo.width,h=photo.height;
  image.fillStyle=paper;
  image.fillRect(0,0,w,h);
  if (!framed) {
    image.drawImage(canvas,0,0);
    return;
  }
  const margin=Math.round(Math.min(w,h)*.045);
  const caption=margin*2;
  const scale=Math.min((w-2*margin)/w,(h-margin-caption)/h);
  const mapWidth=w*scale,mapHeight=h*scale;
  const left=(w-mapWidth)/2;
  image.drawImage(canvas,left,margin,mapWidth,mapHeight);
  image.strokeStyle=ink;
  image.lineWidth=Math.max(1,devicePixelRatio);
  image.strokeRect(left,margin,mapWidth,mapHeight);
  image.fillStyle=ink;
  image.font='bold '+Math.round(margin*.8)+'px system-ui';
  image.textAlign='center';
  image.textBaseline='middle';
  image.fillText(cities[cityKey].name+'  ·  MINI METRO',w/2,(margin+mapHeight+h)/2);
}

function showPhoto(back) {
  const button=$('photoFrame');
  button.setAttribute('aria-pressed','false');
  button.onclick=() => {
    const framed=button.getAttribute('aria-pressed')!=='true';
    button.setAttribute('aria-pressed',String(framed));
    paintPhoto(framed);
  };
  $('photoBack').onclick=back;
  showPanel('照片模式','',[],'','photo');
  $('photo').hidden=false;
  paintPhoto(false);
  $('photoBack').focus();
}

$('photoSave').onclick=() => {
  const photo=$('photoPreview');
  const button=$('photoSave');
  button.disabled=true;
  photo.toBlob(blob => {
    button.disabled=false;
    if (!blob) {$('photoStatus').textContent='无法生成 PNG，请重试';return;}
    downloadImage(blob,'mini-metro-'+cityKey.toLowerCase()+'.png');
  },'image/png');
};

function gifPixels(indices) {
  const codes=[], table=new Map();
  let next=258, bits=0, packed=0;
  const emit=code => {
    packed|=code<<bits;
    bits+=9;
    while (bits>=8) {codes.push(packed&255);packed>>=8;bits-=8;}
  };
  emit(256);
  let prefix=indices[0];
  for (let i=1;i<indices.length;i++) {
    const value=indices[i], key=prefix*256+value;
    const existing=table.get(key);
    if (existing!==undefined) {prefix=existing;continue;}
    emit(prefix);
    // Clear before the decoder needs a tenth bit.
    if (next===511) {emit(256);table.clear();next=258;}
    else table.set(key,next++);
    prefix=value;
  }
  emit(prefix);
  emit(257);
  if (bits) codes.push(packed&255);
  const data=[8];
  for (let i=0;i<codes.length;i+=255) {
    const block=codes.slice(i,i+255);
    data.push(block.length,...block);
  }
  data.push(0);
  return data;
}

function gifPalette() {
  const palette=themes[cityKey][night ? 'night' : 'day'];
  const exact=[palette.paper,palette.water,palette.bank,palette.station,palette.ink,...colors];
  const table=[...new Set(exact)].map(color => [1,3,5].map(i => Number.parseInt(color.slice(i,i+2),16)));
  for (let r=0;r<=255;r+=51) for (let g=0;g<=255;g+=51) for (let b=0;b<=255;b+=51) table.push([r,g,b]);
  while (table.length<256) table.push([0,0,0]);
  return table;
}

async function exportReplayGif() {
  const session=replay, button=$('replayGif'), status=$('replayStatus');
  if (!session || button.disabled) return;
  button.disabled=true;
  const frames=replayFrames.length>120
    ? Array.from({length:120},(_,i) => replayFrames[Math.round(i*(replayFrames.length-1)/119)])
    : replayFrames;
  const output=document.createElement('canvas');
  const scale=Math.min(1,480/Math.max(canvas.clientWidth,canvas.clientHeight));
  const w=output.width=Math.max(1,Math.round(canvas.clientWidth*scale));
  const h=output.height=Math.max(1,Math.round(canvas.clientHeight*scale));
  const image=output.getContext('2d',{willReadFrequently:true});
  const palette=gifPalette(), cached=new Map();
  const word=n => [n&255,(n>>8)&255];
  const ascii=s => Array.from(s,c => c.charCodeAt(0));
  const chunks=[Uint8Array.from([
    ...ascii('GIF89a'),...word(w),...word(h),247,0,0,...palette.flat(),
    33,255,11,...ascii('NETSCAPE2.0'),3,1,0,0,0,
  ])];
  try {
    for (const [index,frame] of frames.entries()) {
      if (replay!==session) return;
      status.textContent='正在生成 '+(index+1)+' / '+frames.length;
      const oldCtx=ctx;
      ctx=image;
      try {paint(true,{frame,edges:indexTracks(frame.lines)},output);}
      finally {ctx=oldCtx;}
      image.save();
      image.setTransform(1,0,0,1,0,0);
      image.globalCompositeOperation='destination-over';
      image.fillStyle=paper;
      image.fillRect(0,0,w,h);
      image.restore();
      const pixels=image.getImageData(0,0,w,h).data;
      const indices=new Uint8Array(w*h);
      for (let i=0,j=0;i<pixels.length;i+=4,j++) {
        const r=pixels[i],g=pixels[i+1],b=pixels[i+2], key=(r<<16)|(g<<8)|b;
        if (!cached.has(key)) {
          let best=Infinity, selected=0;
          for (let k=0;k<palette.length;k++) {
            const [pr,pg,pb]=palette[k];
            const error=(pr-r)**2+(pg-g)**2+(pb-b)**2;
            if (error<best) {best=error;selected=k;}
            if (!error) break;
          }
          cached.set(key,selected);
        }
        indices[j]=cached.get(key);
      }
      const next=frames[index+1];
      const delay=next ? Math.round(replayDelay(frame,next)/10) : 120;
      chunks.push(Uint8Array.from([33,249,4,4,...word(delay),0,0,
        44,0,0,0,0,...word(w),...word(h),0,...gifPixels(indices)]));
      if (index%3===2) await new Promise(resolve => setTimeout(resolve,0));
    }
    const blob=new Blob([...chunks,Uint8Array.of(59)],{type:'image/gif'});
    downloadImage(blob,'mini-metro-'+cityKey.toLowerCase()+'.gif');
    status.textContent='GIF 已生成';
  } catch {
    status.textContent='无法生成 GIF，请重试';
  } finally {
    button.disabled=false;
  }
}

function downloadImage(blob,filename) {
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}

function replayDelay(frame,next) {
  return Math.min(1100,Math.max(230,(next.time-frame.time)*80));
}

$('replayGif').onclick=exportReplayGif;

function recordReplay() {
  const frame={time,stations:stations.map(({x,y,type,capacity}) => ({x,y,type,capacity})),
    lines:lines.map(route => route.slice())};
  replayFrames.push(frame);
}

function setReplayIndex(index) {
  replay.index=index;
  replay.frame=replayFrames[index];
  replay.edges=indexTracks(replay.frame.lines);
  $('replaySeek').value=index;
  $('replayTime').textContent='第 '+(1+Math.floor(replay.frame.time/(weekDuration/7)))+' 日';
  const next=replayFrames[index+1];
  replay.deadline=next ? performance.now()+replayDelay(replay.frame,next) : Infinity;
  if (!next) replay.playing=false;
  $('replayPlay').textContent=replay.playing ? '暂停回放' : '播放回放';
}

function showReplay() {
  showPanel('路网回放','',[],'','replay');
  $('replay').hidden=false;
  $('replayStatus').textContent='';
  replay={playing:true};
  $('replaySeek').max=replayFrames.length-1;
  setReplayIndex(0);
  $('replayBack').focus();
}

$('replaySeek').oninput=event => {
  replay.playing=false;
  setReplayIndex(Number(event.target.value));
};
$('replayPlay').onclick=() => {
  replay.playing=!replay.playing;
  setReplayIndex(replay.playing && replay.index===replayFrames.length-1 ? 0 : replay.index);
};
$('replayBack').onclick=() => {showResult();$('choices').children[5].focus();};

function showResult() {
  showPanel('运营结束','有一个车站持续超载。送达 '+score+' 人 · 最高 '+Math.max(score,bestScore())+' 人。',[
    ['再试一次',() => start(cityKey,mode)],
    ['继续无尽模式',() => {mode='endless';phase='play';collapseStation=null;stations.forEach(s => {s.pressure=0;});$('screen').close();updateHUD();}],
    ['继续创意模式',() => {
      mode='creative';phase='play';collapseStation=null;
      stations.forEach(station => {station.pressure=0;});
      enableCreative();updateLines();updateHUD();$('screen').close();
    }],
    ['城市选择',showMenu],
    ['运营统计',showStatistics],
    ['路网回放',showReplay,replayFrames.length<2],
    ['照片模式',() => showPhoto(showResult)],
  ],cities[cityKey].name,'ended');
  const statisticsButton=$('choices').children[4];
  const replayButton=$('choices').children[5];
  replayButton.setAttribute('aria-label','路网回放');
  replayButton.title='路网回放';
  replayButton.textContent='▶';
  const camera=$('choices').children[6];
  camera.setAttribute('aria-label','照片模式');
  camera.title='照片模式';
  camera.textContent='▣';
  statisticsButton.setAttribute('aria-label','运营统计');
  statisticsButton.title='运营统计';
  statisticsButton.textContent='▥';
}

function showStatistics() {
  showPanel('运营统计','',[],'','statistics');
  $('statistics').hidden=false;
  const selected=new Set(['dailyTrips','totalTrips','population']);
  const svg=$('chart'), ns='http://www.w3.org/2000/svg';
  const element=(tag,attrs) => {
    const node=document.createElementNS(ns,tag);
    for (const [name,value] of Object.entries(attrs)) node.setAttribute(name,value);
    return node;
  };
  const draw=() => {
    svg.replaceChildren();
    const end=history.at(-1).time || 1;
    for (const [key,label,color,unit] of metrics) {
      if (!selected.has(key)) continue;
      const maximum=Math.max(1,...history.map(sample => sample[key]));
      const points=history.map(sample => [16+sample.time/end*608,266-sample[key]/maximum*246]);
      const path=element('polyline',{points:points.map(p => p.join(',')).join(' '),fill:'none',stroke:color,
        'stroke-width':3.5,'stroke-linejoin':'round','data-series':key});
      const title=element('title',{});
      title.textContent=label+' · '+history.at(-1)[key].toLocaleString('zh-CN',{maximumFractionDigits:2})+' '+unit;
      path.append(title);
      svg.append(path);
      if (key==='population' || points.length===1) {
        for (const [x,y] of points) svg.append(element('circle',{cx:x,cy:y,r:4,fill:color}));
      }
    }
  };
  $('metrics').replaceChildren(...metrics.map(([key,label,color,unit]) => {
    const button=document.createElement('button');
    button.textContent=label;
    button.title=history.at(-1)[key].toLocaleString('zh-CN',{maximumFractionDigits:2})+' '+unit;
    button.style.setProperty('--metric',color);
    button.setAttribute('aria-pressed',selected.has(key));
    button.onclick=() => {
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
      button.setAttribute('aria-pressed',selected.has(key));
      draw();
    };
    return button;
  }));
  draw();
  $('statsBack').focus();
}

const lessonStations=[
  [410,185,0], [555,205,2], [352,176,1],
  [648,215,0], [505,145,1], [629,362,0],
];
const lessonHints=[
  '从圆形站拖到方形站，送方形乘客到站',
  '等列车把第一位乘客送到目的地',
  '把线路端点延长到三角形车站',
  '继续延长线路，或把线段拖到新站插入',
  '连接河对岸的车站，使用一个过河通道',
];

function addLessonStation(index) {
  const [x,y,type]=lessonStations[index];
  stations.push({x,y,type,waiting:[],pressure:0,capacity:6,born:index<2 ? -1 : time});
  recordReplay();
}

function startTutorial() {
  start('London','normal');
  stations=[];
  lesson={stage:0,elapsed:0,changed:0};
  inventory.lines=inventory.trains=inventory.crossings=1;
  document.documentElement.dataset.lesson='0';
  addLessonStation(0);
  addLessonStation(1);
  replayFrames=[];
  recordReplay();
  stations[0].waiting.push(passenger(2));
  history=[];
  sampleStatistics();
  updateLines();
  updateHUD();
}

function lessonStage(stage) {
  lesson.stage=stage;
  lesson.changed=lesson.elapsed;
  document.documentElement.dataset.lesson=String(stage);
  updateHUD();
}

function finishTutorial() {
  lesson=null;
  document.documentElement.removeAttribute('data-lesson');
  inventory.lines=3;
  inventory.trains+=2;
  inventory.crossings=Math.max(2,inventory.crossings);
  time=weekDuration;
  nextStation=time+16;
  nextPassenger=time+3;
  sampleStatistics();
  try {localStorage.setItem('metro-tutorial','done');} catch {}
  updateLines();
  updateHUD();
  upgrade();
}

function simulateTutorial(dt) {
  lesson.elapsed+=dt;
  if (lesson.stage===0) {
    if (lines[0].length>=2) lessonStage(1);
    else return;
  }
  time+=dt;
  moveTrains(dt);
  if (lesson.stage===1 && score>=1) {
    stations[1].waiting.push(passenger(0));
    addLessonStation(2);
    stations[0].waiting.push(passenger(1));
    lessonStage(2);
  } else if (lesson.stage===2 && new Set(lines[0]).size>=3) {
    addLessonStation(3);
    stations[3].waiting.push(passenger(2));
    lessonStage(3);
  } else if (lesson.stage===3) {
    if (stations.length===4 && lesson.elapsed-lesson.changed>=2) {
      addLessonStation(4);
      stations[4].waiting.push(passenger(0));
    }
    if (new Set(lines[0]).size>=5) {
      addLessonStation(5);
      stations[5].waiting.push(passenger(2));
      lessonStage(4);
    }
  } else if (lesson.stage===4 && new Set(lines[0]).size>=6 && crossings(lines[0])>0) {
    finishTutorial();
  }
}

function extremeUnlocked(city) {
  if (unlockedExtreme.has(city)) return true;
  try {return localStorage.getItem('metro-extreme-'+city)==='unlocked';} catch {return false;}
}

function checkExtremeChallenge() {
  if (mode!=='normal' || drag || paused || !eligibleExtreme || extremeUnlocked(cityKey)) return;
  const goal=extremeGoals[cityKey];
  eligibleExtreme=goal.count()<=goal.limit;
  if (!eligibleExtreme || score<goal.score) return;
  unlockedExtreme.add(cityKey);
  try {localStorage.setItem('metro-extreme-'+cityKey,'unlocked');} catch {}
  notify(cities[cityKey].name+'极限模式已解锁');
}

function simulate(dt) {
  if (lesson) {simulateTutorial(dt);return;}
  time += dt;
  if (mode==='extreme' && upcomingStation===undefined && time>=nextStation-4) upcomingStation=findStationPosition();
  if (mode!=='creative' && time>=nextStation) {
    spawnStation(upcomingStation===undefined ? findStationPosition() : upcomingStation);
    upcomingStation=undefined;
    nextStation+=Math.max(8,17-time/80);
  }
  if (time>=nextPassenger) {
    spawnPassenger();
    const interval=mode==='endless'
      ? Math.max(.08,(weekDuration/7)/(8+2.8*(stations.length-3)+4*scenicMilestone))
      : mode==='creative' ? Math.max(.25,5/Math.max(1,stations.reduce((total,s) => total+(s.demand ?? 1),0)))
      : Math.max(.48,3.2/(1+time/120+stations.length/28));
    nextPassenger+=interval;
  }
  moveTrains(dt);
  const firstRecent=recentTrips.findIndex(trip => trip>time-weekDuration);
  if (firstRecent<0) recentTrips.length=0;
  else if (firstRecent>0) recentTrips.splice(0,firstRecent);
  checkExtremeChallenge();
  for (const s of stations) {
    s.pressure = mode!=='endless' && mode!=='creative' && s.waiting.length>s.capacity
      ? Math.min(overloadLimit,s.pressure+dt) : Math.max(0,s.pressure-2*dt);
    if (mode!=='endless' && mode!=='creative' && s.pressure>=overloadLimit) {
      phase = 'ended';
      collapseStation = s;
      const record = Math.max(score,bestScore());
      try {localStorage.setItem('metro-best-' + cityKey + '-' + mode, String(record));} catch {}
      sampleStatistics();
      recordReplay();
      showResult();
      return;
    }
  }
  const dayLength=weekDuration/7;
  if (Math.floor(time/dayLength)>Math.floor((time-dt)/dayLength)) sampleStatistics();
  if (mode==='endless') {
    week=1+Math.floor(time/weekDuration);
    awardScenicMilestones();
  } else if (mode==='creative') week=1+Math.floor(time/weekDuration);
  else if (time>=week*weekDuration) upgrade();
}

function updateLines() {
  $('lines').replaceChildren(...lines.map((route,i) => {
    if (i>=inventory.lines) {
      const locked=document.createElement('span');
      locked.className='line locked';
      locked.setAttribute('aria-hidden','true');
      return locked;
    }
    const button = document.createElement('button');
    button.className = route.length ? 'line' : 'line empty';
    button.style.setProperty('--line',colors[i]);
    button.setAttribute('aria-label','线路 '+(i+1));
    button.setAttribute('aria-pressed',i===selected);
    button.title = '线路 '+(i+1);
    button.onclick = () => {selected=i; highlightUntil=performance.now()+1500; updateLines(); updateHUD();};
    return button;
  }));
}

function updateHUD() {
  const endless=mode==='endless', efficiency=endless ? scenicEfficiency() : 0;
  $('score').textContent=endless ? Math.floor(efficiency)+'/'+nextEfficiency : score;
  $('score').setAttribute('aria-label',endless ? '七日平均每日送达' : '已送达');
  $('scenicMeter').hidden=!endless;
  if (endless) {
    const progress=Math.min(100,efficiency/nextEfficiency*100);
    $('scenicMeter').style.setProperty('--progress',progress+'%');
    $('scenicMeter').setAttribute('aria-valuenow',String(Math.round(progress)));
    $('scenicMeter').title='下一里程碑：每日 '+nextEfficiency+' 人';
  }
  const day = time/(weekDuration/7);
  $('day').textContent = '周'+days[Math.floor(day)%7];
  $('day').title = '第 '+week+' 周';
  $('clock').style.setProperty('--clock-angle', (day%1)*360+'deg');
  $('pause').setAttribute('aria-pressed',String(paused));
  $('normalSpeed').setAttribute('aria-pressed',String(!paused && speed===1));
  $('speed').setAttribute('aria-pressed',String(!paused && speed===2));
  $('creativeEdit').hidden=mode!=='creative';
  $('trainCount').textContent = mode==='creative' ? '∞' : inventory.trains;
  $('train').disabled = !inventory.trains || !lines.some((route,line) => route.length && trains.filter(t => t.line===line).length < trainLimit());
  $('carCount').textContent = mode==='creative' ? '∞' : inventory.cars;
  $('interchangeCount').textContent = mode==='creative' ? '∞' : inventory.interchanges;
  $('interchange').disabled = !inventory.interchanges;
  $('car').disabled = !inventory.cars || !trains.length;
  $('remove').disabled = mode==='extreme' || !lines[selected].length;
  $('crossingCount').textContent = mode==='creative' ? '∞' : inventory.crossings-usedCrossings();
  $('hint').textContent = performance.now() < feedbackUntil ? feedback :
    lesson ? lessonHints[lesson.stage] :
    paused ? '已暂停 · 可以继续调整线路' :
    !lines.some(route => route.length) ? '从一个车站拖向另一个车站，开通第一条地铁线' :
    mode==='extreme' ? '极限模式 · 只能从线路端点延长' : '拖动端点改线 · 两端相连成环';
}

function showPanel(title,description,buttons,kicker,kind='menu') {
  $('screen').dataset.kind = kind;
  $('cityStrip').hidden = true;
  $('statistics').hidden = true;
  $('photo').hidden=true;
  $('replay').hidden=true;
  replay=null;
  $('photoStatus').textContent='';
  $('headline').textContent = title;
  $('description').textContent = description;
  $('kicker').textContent = kicker;
  $('choices').replaceChildren(...buttons.map(([text,action,disabled]) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.onclick = action;
    button.disabled = Boolean(disabled);
    return button;
  }));
  if (!$('screen').open) $('screen').showModal();
}

function start(key,gameMode) {
  mode = gameMode;
  reset(key);
  $('screen').close();
}

function applyNight(enabled) {
  night=enabled;
  document.documentElement.classList.toggle('night',enabled);
  ({paper,water,ink,colors}=themes[cityKey][enabled ? 'night' : 'day']);
  document.documentElement.style.setProperty('--paper',paper);
  document.documentElement.style.setProperty('--ink',ink);
}

function showPauseMenu() {
  showPanel('暂停',cities[cityKey].name,[
    ['继续运营',() => {$('screen').close();}],
    [night ? '夜间模式：开' : '夜间模式：关',() => {
      applyNight(!night);
      updateLines();
      try {localStorage.setItem('metro-night',String(night));} catch {}
      showPauseMenu();
      $('choices').children[1].focus();
    }],
    [lesson ? '跳过教程' : '重新开始',() => start(cityKey,mode)],
    ['城市选择',showMenu],
    ['照片模式',() => showPhoto(showPauseMenu)],
  ],'','pause');
  $('choices').children[1].setAttribute('aria-pressed',String(night));
}

function showMenu() {
  const keys = Object.keys(cities);
  const current = cities[menuCity];
  const options = [
    ['➜ 开始游戏', () => start(menuCity,menuMode),menuMode==='extreme' && !extremeUnlocked(menuCity)],
    ['↓ 模式 · '+modeNames[menuMode], () => {menuMode=modes[(modes.indexOf(menuMode)+1)%modes.length];showMenu();$('choices').querySelector('[data-mode-toggle]').focus();}],
  ];
  let tutorialDone=false;
  try {tutorialDone=localStorage.getItem('metro-tutorial')==='done';} catch {}
  options[tutorialDone ? 'push' : 'unshift'](['伦敦入门教程',startTutorial]);
  if (phase === 'play' && time > 0) options.push(['↖ 继续运营',() => $('screen').close()]);
  const label=menuCity==='NewYork' ? 'New York' : menuCity;
  const description=menuMode==='creative' ? '创意模式 · 手动设计车站与客流' : menuMode==='endless' ? '无尽模式 · 提高每日客运量以获得资源' : menuMode==='extreme' && !extremeUnlocked(menuCity) ? '解锁条件：'+extremeGoals[menuCity].label : label;
  showPanel(current.name,description,options,'Mini Metro','cities');
  [...$('choices').children].find(button => button.textContent.startsWith('↓')).dataset.modeToggle='';
  $('cityStrip').hidden = false;
  $('cityStrip').replaceChildren(...keys.map(key => {
    const city = cities[key];
    const button = document.createElement('button');
    button.className = 'city-option';
    button.setAttribute('aria-pressed',key===menuCity);
    const preview=themes[key][night ? 'night' : 'day'];
    button.style.setProperty('--accent',preview.colors[1]);
    const name = document.createElement('span');
    name.textContent = city.name;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','200 100 550 360');
    svg.setAttribute('aria-hidden','true');
    const line = (points, color, weight) => {
      const stroke = document.createElementNS(ns,'polyline');
      stroke.setAttribute('points',points.map(point => point.join(',')).join(' '));
      stroke.setAttribute('fill','none');
      stroke.setAttribute('stroke',color);
      stroke.setAttribute('stroke-width',weight);
      svg.append(stroke);
    };
    for (const river of waterways(city)) line(city.vertical ? river.map(([x,y]) => [y,x]) : river,preview.water,23);
    const [a,b,c] = city.start;
    line([[a[0]-100,a[1]+90],a,b],preview.colors[0],6);
    line([a,c,[c[0]+75,c[1]+80]],preview.colors[1],6);
    line([[b[0]-100,b[1]+70],b,c],preview.colors[2],6);
    for (const [x,y] of city.start) {
      const dot = document.createElementNS(ns,'circle');
      dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r',9);
      dot.setAttribute('fill',preview.station);dot.setAttribute('stroke',preview.ink);dot.setAttribute('stroke-width',3);
      svg.append(dot);
    }
    button.append(name,svg);
    button.onclick = () => {menuCity=key;showMenu();$('cityStrip').children[keys.indexOf(key)].focus();};
    return button;
  }));
}

function shape(type,x,y,r,fill,outline,weight=3.5) {
  ctx.beginPath();
  if (type === 0) ctx.arc(x,y,r,0,Math.PI*2);
  else if (type === 2) ctx.rect(x-r*.82,y-r*.82,r*1.64,r*1.64);
  else if (type === 6) {
    const h=r/3;
    for (const [dx,dy] of [[-h,-r],[h,-r],[h,-h],[r,-h],[r,h],[h,h],[h,r],[-h,r],[-h,h],[-r,h],[-r,-h],[-h,-h]]) ctx.lineTo(x+dx,y+dy);
  } else {
    const sides = [0,3,0,4,10,5][type];
    for (let i=0;i<sides;i++) {
      const a = i*2*Math.PI/sides-Math.PI/2;
      const radius = type===4 && i%2 ? r*.46 : r;
      ctx.lineTo(x+radius*Math.cos(a),y+radius*Math.sin(a));
    }
  }
  ctx.closePath();
  ctx.fillStyle=fill;
  ctx.fill();
  if (outline) {ctx.lineWidth=weight;ctx.strokeStyle=outline;ctx.stroke();}
}

function drawRoute(route,index,preview=false,closed=false,riverClip=null,source=null) {
  const ids=(source?.frame.lines ?? lines)[index], mapStations=source?.frame.stations ?? stations;
  if (route.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(route[0].x,route[0].y);
  for (let i=1;i<route.length;i++) {
    const track = preview ? trackBetween(route[i-1],route[i]) : lineTrack(ids[i-1],ids[i],index,mapStations,source?.edges ?? edgeLines);
    for (const p of track.slice(1)) ctx.lineTo(p.x,p.y);
  }
  ctx.lineWidth=7;
  ctx.lineJoin='round';
  ctx.lineCap='round';
  ctx.strokeStyle=colors[index];
  ctx.globalAlpha=preview ? .52 : 1;
  ctx.stroke();
  if (riverClip && !preview) {
    ctx.save();
    ctx.clip(riverClip);
    ctx.setLineDash([3,7]);
    ctx.lineCap='butt';
    ctx.lineWidth=8;
    ctx.strokeStyle=water;
    ctx.stroke();
    ctx.restore();
  }
  if (!preview) {
    const served=new Set(ids);
    const bypass=new Path2D();
    mapStations.forEach((station,id) => {
      if (served.has(id)) return;
      bypass.moveTo(station.x+19,station.y);
      bypass.arc(station.x,station.y,19,0,2*Math.PI);
    });
    ctx.save();
    ctx.clip(bypass);
    ctx.lineWidth=3;
    ctx.strokeStyle=paper;
    ctx.stroke();
    ctx.restore();
  }
  if (!closed && !preview) {
    ctx.beginPath();
    for (const [end,other] of [[route[0],route[1]],[route.at(-1),route.at(-2)]]) {
      const first = trackBetween(end,other)[1];
      const length = distance(end,first);
      const dx=(end.x-first.x)/length, dy=(end.y-first.y)/length;
      const x=end.x+dx*18, y=end.y+dy*18;
      ctx.moveTo(end.x,end.y);ctx.lineTo(x,y);
      ctx.moveTo(x-dy*5,y+dx*5);ctx.lineTo(x+dy*5,y-dx*5);
    }
    ctx.lineWidth=4;
    ctx.stroke();
  }
  ctx.globalAlpha=1;
}

function trainPose(train,car=0) {
  const route=lines[train.line];
  const points=train.points ?? lineTrack(route[train.stop],route[stepIndex(route,train.stop,train.direction)],train.line);
  let traveled=train.progress-car*19, segment=1;
  while (segment<points.length-1 && traveled>distance(points[segment-1],points[segment])) {
    traveled-=distance(points[segment-1],points[segment]);
    segment++;
  }
  const from=points[segment-1], to=points[segment];
  const fraction=traveled/distance(from,to);
  return {x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction,
    angle:Math.atan2(to.y-from.y,to.x-from.x)};
}

function drawTrain(train) {
  for (let i=0;i<=train.cars;i++) {
    const pose=trainPose(train,i);
    ctx.save();
    ctx.translate(pose.x,pose.y);
    ctx.rotate(pose.angle);
    ctx.globalAlpha=train.move && (train.move.car===0 || train.move.car===i) ? .45 : 1;
    ctx.fillStyle=colors[train.line];
    ctx.fillRect(-8,-4.5,16,9);
    ctx.fillStyle=paper;
    train.riders.slice(i*6,i*6+6).forEach((rider,j) => shape(rider.type,-5+j%3*5,-2+Math.floor(j/3)*4,1.65,paper));
    if (paused && i===0) {
      ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(10,-4);ctx.lineTo(10,4);ctx.closePath();
      ctx.fillStyle=colors[train.line];ctx.fill();
    }
    ctx.restore();
  }
}

function paint(clean=false,source=null,target=canvas) {
  const mapStations=source?.frame.stations ?? stations, mapLines=source?.frame.lines ?? lines;
  const ratio=target===canvas ? devicePixelRatio : 1;
  const camera=target===canvas ? view : cameraView(canvas.clientWidth,canvas.clientHeight,source.frame.time);
  const scale=target===canvas ? 1 : target.width/canvas.clientWidth;
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.clearRect(0,0,target.width/ratio,target.height/ratio);
  ctx.translate(camera.x*scale,camera.y*scale);
  ctx.scale(camera.scale*scale,camera.scale*scale);
  const city=cities[cityKey], riverClip=new Path2D();
  for (const [i,river] of waterways(city).entries()) {
    const edge=[[-width,river[0][1]],...river,[width*2,river.at(-1)[1]]];
    const bank=(points,side) => points.map(([x,y],j) => {
      const variation=1.8*Math.sin(j*2.1)+1.5*Math.cos(j*1.2);
      const offset=y+side*(16-i*5+variation);
      return city.vertical ? [offset,x] : [x,offset];
    });
    const polygon=bank(edge,-1).concat(bank(edge,1).reverse());
    riverClip.moveTo(...polygon[0]);
    for (const point of polygon.slice(1)) riverClip.lineTo(...point);
    riverClip.closePath();
  }
  const theme=themes[cityKey], palette=theme[night ? 'night' : 'day'];
  ctx.fillStyle=water;
  ctx.fill(riverClip);
  ctx.strokeStyle=palette.bank;
  ctx.lineWidth=theme.bankWidth;
  ctx.lineJoin='round';
  ctx.stroke(riverClip);
  const ghostEdges=new Set();
  for (const train of source ? [] : retiring) {
    const key=train.line+'/'+edgeKey(train.from,train.to);
    if (ghostEdges.has(key)) continue;
    ghostEdges.add(key);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(train.points[0].x,train.points[0].y);
    for (const p of train.points.slice(1)) ctx.lineTo(p.x,p.y);
    ctx.lineWidth=6;
    ctx.strokeStyle=colors[train.line];
    ctx.globalAlpha=.32;
    ctx.setLineDash([5,4]);
    ctx.stroke();
    ctx.restore();
  }
  mapLines.forEach((route,index) => drawRoute(route.map(id => mapStations[id]),index,false,looped(route),riverClip,source));
  if (!clean && drag?.point) {
    const points = drag.draft.map(id => stations[id]);
    if (drag.insert !== null) {
      if (drag.draft===drag.route) points.splice(drag.insert,0,drag.point);
    } else if (!looped(drag.draft)) {
      const end = drag.head ? points[0] : points.at(-1);
      if (distance(drag.point,end)>1) {
        if (drag.head) points.unshift(drag.point);
        else points.push(drag.point);
      }
    }
    drawRoute(points,drag.line,true);
  }
  if (!clean && mode==='extreme' && upcomingStation) {
    const {x,y}=upcomingStation;
    ctx.beginPath();ctx.arc(x,y,5.5,0,2*Math.PI);
    ctx.save();ctx.globalAlpha=.24;ctx.fillStyle=ink;ctx.fill();ctx.restore();
  }
  const highlighted=clean ? [] : drag?.draft ?? (performance.now()<highlightUntil ? lines[selected] : []);
  const highlightColor=colors[drag?.line ?? selected];
  for (const [id,s] of mapStations.entries()) {
    if (!clean && s.pressure>0) {
      ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.arc(s.x,s.y,s===collapseStation ? 27 : 19,-Math.PI/2,-Math.PI/2+2*Math.PI*s.pressure/overloadLimit);
      ctx.fillStyle=night ? '#f0e8e34a' : '#24282bb5';ctx.fill();
    }
    const growth = source ? 1 : Math.min(1,Math.max(.1,(time-s.born)/.55));
    const radius = 11*(1-Math.pow(1-growth,3));
    if (s.capacity>6) {ctx.beginPath();ctx.arc(s.x,s.y,16,0,2*Math.PI);ctx.fillStyle=ink;ctx.fill();}
    if (highlighted.includes(id)) {
      ctx.beginPath();ctx.arc(s.x,s.y,16,0,2*Math.PI);
      ctx.strokeStyle=highlightColor;ctx.lineWidth=2;ctx.stroke();
    }
    shape(s.type,s.x,s.y,radius,palette.station,ink,theme.stationWidth);
    s.waiting?.slice(0,16).forEach((rider,i) => shape(rider.type,s.x+19+i%8*9,s.y-9+Math.floor(i/8)*10,3.5,ink));
    if (s.waiting?.length>16) {
      ctx.fillStyle=ink;ctx.font='10px system-ui';ctx.fillText('+'+(s.waiting.length-16),s.x+19,s.y+14);
    }
  }
  if (!clean && lesson?.stage===0 && !drag) {
    for (const [id,label,offset] of [[0,'从这里拖动',-64],[1,'连接到这里',64]]) {
      const station=stations[id];
      ctx.save();
      ctx.translate(station.x+offset,station.y-offset*.65);
      ctx.rotate(-Math.PI/4);
      ctx.fillStyle=night ? '#655a61' : '#695956';
      ctx.beginPath();ctx.roundRect(-55,-12,110,24,12);ctx.fill();
      ctx.font='12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='#fff';ctx.fillText(label,0,0);
      ctx.restore();
    }
  }
  if (!source) {retiring.forEach(drawTrain);trains.forEach(drawTrain);}
}

function resize() {
  const w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=Math.round(w*devicePixelRatio);
  canvas.height=Math.round(h*devicePixelRatio);
  updateCamera(w,h);
}

function cameraView(w,h,mapTime) {
  const zoom=1+.36*(1-Math.min(1,Math.max(0,mapTime-weekDuration/7)/540));
  const scale=Math.min(w/width,Math.max(0.1,(h-75)/height))*zoom;
  return {scale,x:(w-width*scale)/2,y:(h-height*scale)/2-4};
}

function updateCamera(w=canvas.clientWidth,h=canvas.clientHeight) {
  view=cameraView(w,h,replay?.frame.time ?? time);
}

function pointerPoint(event) {
  const bounds=canvas.getBoundingClientRect();
  return {x:(event.clientX-bounds.left-view.x)/view.scale,y:(event.clientY-bounds.top-view.y)/view.scale};
}

function stationAt(point) {
  const radius=Math.min(42,Math.max(16,15/view.scale));
  let nearest=-1,best=radius;
  stations.forEach((station,i) => {
    const d=distance(station,point);
    if (d<best) {nearest=i;best=d;}
  });
  return nearest;
}

function segmentAt(point,route,line,maxDistance) {
  let best=maxDistance, index=null, progress=0;
  for (let i=1;i<route.length;i++) {
    const points=lineTrack(route[i-1],route[i],line);
    let traveled=0;
    for (let j=1;j<points.length;j++) {
      const a=points[j-1], b=points[j], dx=b.x-a.x, dy=b.y-a.y;
      const length=distance(a,b);
      if (!length) continue;
      const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length**2));
      const d=Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);
      if (d<best) {index=i;best=d;progress=traveled+t*length;}
      traveled+=length;
    }
  }
  return {index,distance:best,progress};
}

function vehicleAt(point) {
  let best=Math.max(9,8/view.scale), result=null;
  for (const train of trains) {
    for (let car=0;car<=train.cars;car++) {
      const d=distance(trainPose(train,car),point);
      if (d<best) {result={train,car};best=d;}
    }
  }
  return result;
}

function trackAt(point,needsTrain=false) {
  let best=Math.max(16,14/view.scale), result=null;
  lines.forEach((route,line) => {
    if (needsTrain && !trains.some(train => train.line===line)) return;
    const match=segmentAt(point,route,line,best);
    if (match.index!==null) {result={line,...match};best=match.distance;}
  });
  return result;
}

function applyVehicleMove(train) {
  const move=train.move;
  if (!move) return;
  delete train.move;
  const origin=lines[train.line][train.stop];
  if (move.car) {
    if (!trains.includes(move.target) || move.target===train || move.car>train.cars) return;
    unloadRiders(train.riders.splice(move.car*6,6),origin);
    train.cars--;
    move.target.cars++;
  } else {
    const track=segmentAt(move.point,lines[move.line],move.line,Math.max(16,14/view.scale));
    if (track.index===null || (move.line!==train.line && trains.filter(t => t.line===move.line).length>=trainLimit())) return;
    unload(train,origin);
    Object.assign(train,{line:move.line,stop:track.index-1,direction:1,progress:track.progress,velocity:0,dwell:0});
    delete train.approach;
  }
  updateHUD();
}

function scheduleVehicleMove(vehicle,point) {
  const {train,car}=vehicle;
  if (mode==='extreme' || train.move || !trains.includes(train)) return;
  if (car) {
    const target=vehicleAt(point)?.train;
    if (!target || target===train) return;
    train.move={car,target};
  } else {
    const track=trackAt(point);
    if (!track || (track.line!==train.line && trains.filter(t => t.line===track.line).length>=trainLimit())) return;
    train.move={car,line:track.line,point};
  }
  if (train.dwell>0) applyVehicleMove(train);
}

function showAssetGhost(symbol,event) {
  const icon=$('assetGhost');
  icon.hidden=false;
  icon.style.transform='translate('+event.clientX+'px,'+event.clientY+'px)';
  icon.querySelector('use').setAttribute('href',symbol);
}

canvas.onpointerdown = event => {
  if (event.button!==0 || drag || vehicleDrag || assetDrag || phase!=='play') return;
  const point=pointerPoint(event);
  const station=stationAt(point);
  if (mode==='creative' && $('creativeEdit').getAttribute('aria-pressed')==='true') {
    creativePointer(point,station);
    return;
  }
  if ($('interchange').getAttribute('aria-pressed')==='true' && station>=0) {
    placeInterchange(station);
    return;
  }
  const vehicle=station<0 ? vehicleAt(point) : null;
  if (vehicle && !vehicle.train.move && mode!=='extreme') {
    vehicleDrag={...vehicle,pointer:event.pointerId,origin:point,moved:false};
    canvas.setPointerCapture(event.pointerId);
    return;
  }
  const route=lines[selected];
  let insert=null, head=false, draft=route.slice(), line=selected;
  if (station>=0) {
    if (!route.length) draft=[station];
    else if (!looped(route) && (station===route[0] || station===route.at(-1))) head=station===route[0];
    else if (route.includes(station)) {
      notify('拖动线段加站，或从端点调整线路');
      return;
    } else {
      line=lines.slice(0,inventory.lines).findIndex(path => !path.length);
      if (line<0) {notify('请选择空闲线路，或从已有线路的端点拖动');return;}
      draft=[station];
    }
  } else {
    if (mode==='extreme') return;
    insert=segmentAt(point,route,selected,Math.max(9,8/view.scale)).index;
    if (insert===null) return;
  }
  drag={pointer:event.pointerId,point,origin:point,lastStation:station,line,route:draft,draft,head,insert};
  canvas.setPointerCapture(event.pointerId);
};

function extendDraft(target) {
  if (target<0 || target===drag.lastStation) return;
  drag.lastStation=target;
  const {draft,head,insert,route}=drag;
  if (insert!==null) {
    if (!route.includes(target)) drag.draft=route.slice(0,insert).concat(target,route.slice(insert));
    return;
  }
  if (looped(draft)) return;
  const existing=draft.indexOf(target);
  const opposite=head ? draft.at(-1) : draft[0];
  if (existing<0 || (draft.length>=3 && target===opposite)) {
    drag.draft=head ? [target,...draft] : [...draft,target];
  } else if (mode!=='extreme') {
    drag.draft=head ? draft.slice(existing) : draft.slice(0,existing+1);
  }
}

canvas.onpointermove = event => {
  if (vehicleDrag?.pointer===event.pointerId) {
    vehicleDrag.moved ||= distance(vehicleDrag.origin,pointerPoint(event))*view.scale>8;
    if (vehicleDrag.moved) showAssetGhost(vehicleDrag.car ? '#carriage' : '#locomotive',event);
    return;
  }
  if (drag?.pointer !== event.pointerId) return;
  const point=pointerPoint(event), target=stationAt(point);
  drag.point=target>=0 ? stations[target] : point;
  extendDraft(target);
};

canvas.onpointerup = event => {
  if (vehicleDrag?.pointer===event.pointerId) {
    const vehicle=vehicleDrag;
    vehicleDrag=null;
    $('assetGhost').hidden=true;
    if (vehicle.moved) scheduleVehicleMove(vehicle,pointerPoint(event));
    return;
  }
  if (drag?.pointer !== event.pointerId) return;
  const point=pointerPoint(event), target=stationAt(point);
  extendDraft(target);
  const {route,draft,line,insert,origin}=drag;
  drag=null;
  let updated=draft;
  if (target<0 && insert!==null && looped(route) && route===draft && distance(point,origin)>25) {
    updated=route.slice(insert,-1).concat(route.slice(0,insert));
  }
  if (updated===route) return;
  const previous=selected;
  selected=line;
  if (!setRoute(line,updated)) selected=previous;
};
canvas.onpointercancel = canvas.onlostpointercapture = () => {drag=vehicleDrag=null;$('assetGhost').hidden=true;};

$('clock').onclick=() => { const timeControls=$('time'); timeControls.hidden=!timeControls.hidden; $('clock').setAttribute('aria-expanded',String(!timeControls.hidden)); };
function setClockStage(stage) {
  paused=stage===0;
  if (!paused) speed=stage;
  updateHUD();
}
$('pause').onclick=() => setClockStage(0);
$('normalSpeed').onclick=() => setClockStage(1);
$('speed').onclick=() => setClockStage(2);
function placeInterchange(id) {
  if (id<0 || !inventory.interchanges) return;
  if (stations[id].capacity>6) {notify('此站已升级');return;}
  stations[id].capacity=18;
  recordReplay();
  inventory.interchanges--;
  $('interchange').setAttribute('aria-pressed','false');
  updateHUD();
}

function assignAsset(id,point) {
  if (id==='interchange') {placeInterchange(stationAt(point));return;}
  const placement=trackAt(point,id==='car');
  if (!placement) return;
  selected=placement.line;
  if (id==='train') addTrain(selected,placement);
  else addCar(selected,point);
  updateLines();
  updateHUD();
}

for (const id of ['train','car','interchange']) {
  const button=$(id);
  button.onpointerdown=event => {
    if (event.button!==0) return;
    assetDrag={id,pointer:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
    button.setPointerCapture(event.pointerId);
  };
  button.onpointermove=event => {
    if (assetDrag?.pointer!==event.pointerId) return;
    assetDrag.moved ||= Math.hypot(assetDrag.x-event.clientX,assetDrag.y-event.clientY)>12;
    if (!assetDrag.moved) return;
    showAssetGhost(button.querySelector('use').getAttribute('href'),event);
  };
  button.onpointerup=event => {
    if (assetDrag?.pointer!==event.pointerId) return;
    const {moved}=assetDrag;
    assetDrag=null;
    $('assetGhost').hidden=true;
    if (moved) assignAsset(id,pointerPoint(event));
    button.dataset.dragged=String(moved);
  };
  button.onpointercancel=button.onlostpointercapture=() => {
    assetDrag=null;
    $('assetGhost').hidden=true;
  };
  button.onclick=event => {
    if (event.detail && button.dataset.dragged==='true') return;
    if (id==='train') addTrain(selected);
    else if (id==='car') addCar();
    else {
      const active=button.getAttribute('aria-pressed')==='true';
      button.setAttribute('aria-pressed',String(!active));
      if (!active) notify('选择一个车站，将容量从 6 提高到 18');
    }
  };
}
$('statsBack').onclick=() => {showResult();$('choices').children[4].focus();};
$('creativeEdit').onclick=() => {
  const button=$('creativeEdit'), enabled=button.getAttribute('aria-pressed')!=='true';
  button.setAttribute('aria-pressed',String(enabled));
  notify(enabled ? '点击车站进行编辑，点击空地添加车站' : '返回线路编辑');
};
$('remove').onclick=() => setRoute(selected,[]);
$('menu').onclick=showPauseMenu;
$('screen').oncancel=event => event.preventDefault();
window.addEventListener('keydown',event => {
  if (event.key==='Escape') {
    if ($('screen').open) {
      if ($('screen').dataset.kind==='pause') $('screen').close();
      if ($('screen').dataset.kind==='photo') $('photoBack').click();
      if ($('screen').dataset.kind==='replay') $('replayBack').click();
    } else showPauseMenu();
    event.preventDefault();
    return;
  }
  if ($('screen').open || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.code==='Space' && !(event.target instanceof HTMLButtonElement)) {
    event.preventDefault();
    setClockStage(paused ? speed : 0);
    return;
  }
  if (event.shiftKey && /^Digit[1-7]$/.test(event.code)) {
    const line=Number(event.code.at(-1))-1;
    if (line<inventory.lines) $('lines').children[line].click();
    event.preventDefault();
    return;
  }
  const requested=Number(event.key);
  if (requested>=1 && requested<=3 && Number.isInteger(requested)) setClockStage(requested-1);
  else if (event.key==='ArrowLeft' || event.key==='ArrowRight') {
    const offset=event.key==='ArrowLeft' ? -1 : 1;
    setClockStage(Math.max(0,Math.min(2,(paused ? 0 : speed)+offset)));
  } else return;
  event.preventDefault();
});
window.addEventListener('resize',resize);

function frame(now) {
  const dt = Math.min(.05,(now-lastFrame)/1000);
  lastFrame=now;
  if (phase==='play' && !paused && !$('screen').open) simulate(dt*speed);
  if (replay?.playing && now>=replay.deadline) setReplayIndex(replay.index+1);
  if (!drag && !assetDrag && !vehicleDrag) updateCamera();
  paint(Boolean(replay),replay);
  requestAnimationFrame(frame);
}
try {applyNight(localStorage.getItem('metro-night')==='true');} catch {}
reset(cityKey);
resize();
showMenu();
setInterval(updateHUD,250);
requestAnimationFrame(frame);









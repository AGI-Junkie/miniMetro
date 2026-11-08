'use strict';

const $ = id => document.getElementById(id);
const canvas = $('map');
let ctx = canvas.getContext('2d');
const width = 960;
const height = 570;
let paper, water, ink, colors;
let night=false;
let colorblind=false;
const colorblindColors=['#e69f00','#58b4e9','#199e69','#ddd101','#3b5798','#a32324','#b1a8b8'];
const unit = .62; // 网页地图单位 = 原版单位 × 0.62，依据见 research/original-reverse-engineering.md
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
const londonMap = {
  // 河道中线（宽 40）与 8 块城市区域，均为原版单位，y 轴朝上。每块区域：scale 为车站密度系数，w 为圆形、三角形、方形、特殊站
  // 在该区域的出现权重，points 是 50 间距的候选格点（以 50 为单位），central 为中心区。
  river: [[-1500,-578],[-1294,-578],[-894,-578],[-894,-358],[-524,-358],[-524,-106],[-466,-48],[-172,-48],[-54,-166],[64,-48],[176,-48],[176,-308],[376,-308],[376,-48],[458,-48],[638,-228],[2726,-228]],
  areas: [
    {central:false,scale:1.25,w:[1.0, 0.2, 0, 0.5],points:[1,-18,2,-18,3,-18,4,-18,5,-18,6,-18,7,-18,8,-18,9,-18,10,-18,11,-18,12,-18,13,-18,14,-18,15,-18,16,-18,17,-18,18,-18,19,-18,20,-18,21,-18,22,-18,23,-18,24,-18,25,-18,26,-18,27,-18,28,-18,29,-18,30,-18,1,-17,2,-17,3,-17,4,-17,5,-17,6,-17,7,-17,8,-17,9,-17,10,-17,11,-17,12,-17,13,-17,14,-17,15,-17,16,-17,17,-17,18,-17,19,-17,20,-17,21,-17,22,-17,23,-17,24,-17,25,-17,26,-17,27,-17,28,-17,29,-17,30,-17,1,-16,2,-16,3,-16,4,-16,5,-16,6,-16,7,-16,8,-16,9,-16,10,-16,11,-16,12,-16,13,-16,14,-16,15,-16,16,-16,17,-16,18,-16,19,-16,20,-16,21,-16,22,-16,23,-16,24,-16,25,-16,26,-16,27,-16,28,-16,29,-16,30,-16,1,-15,2,-15,3,-15,4,-15,5,-15,6,-15,7,-15,8,-15,9,-15,10,-15,11,-15,12,-15,13,-15,14,-15,15,-15,16,-15,17,-15,18,-15,19,-15,20,-15,21,-15,22,-15,23,-15,24,-15,25,-15,26,-15,27,-15,28,-15,29,-15,30,-15,1,-14,2,-14,3,-14,4,-14,5,-14,6,-14,7,-14,8,-14,9,-14,10,-14,11,-14,12,-14,13,-14,14,-14,15,-14,16,-14,17,-14,18,-14,19,-14,20,-14,21,-14,22,-14,23,-14,24,-14,25,-14,26,-14,27,-14,28,-14,29,-14,30,-14,1,-13,2,-13,3,-13,4,-13,5,-13,6,-13,7,-13,8,-13,9,-13,10,-13,11,-13,12,-13,13,-13,14,-13,15,-13,16,-13,17,-13,18,-13,19,-13,20,-13,21,-13,22,-13,23,-13,24,-13,25,-13,26,-13,27,-13,28,-13,29,-13,30,-13,1,-12,2,-12,3,-12,4,-12,5,-12,6,-12,7,-12,8,-12,9,-12,10,-12,11,-12,12,-12,13,-12,14,-12,15,-12,16,-12,17,-12,18,-12,19,-12,20,-12,21,-12,22,-12,23,-12,24,-12,25,-12,26,-12,27,-12,28,-12,29,-12,30,-12,6,-11,7,-11,8,-11,9,-11,10,-11,11,-11,12,-11,13,-11,14,-11,15,-11,16,-11,17,-11,18,-11,19,-11,20,-11,21,-11,22,-11,23,-11,24,-11,25,-11,26,-11,27,-11,28,-11,29,-11,30,-11,6,-10,7,-10,8,-10,9,-10,10,-10,11,-10,12,-10,13,-10,14,-10,15,-10,16,-10,17,-10,18,-10,19,-10,20,-10,21,-10,22,-10,23,-10,24,-10,25,-10,26,-10,27,-10,28,-10,29,-10,30,-10,6,-9,7,-9,8,-9,9,-9,10,-9,11,-9,12,-9,13,-9,14,-9,15,-9,16,-9,17,-9,18,-9,19,-9,20,-9,21,-9,22,-9,23,-9,24,-9,25,-9,26,-9,27,-9,28,-9,29,-9,30,-9,6,-8,7,-8,8,-8,9,-8,10,-8,11,-8,12,-8,13,-8,14,-8,15,-8,16,-8,17,-8,18,-8,19,-8,20,-8,21,-8,22,-8,23,-8,24,-8,25,-8,26,-8,27,-8,28,-8,29,-8,30,-8,9,-7,10,-7,11,-7,12,-7,13,-7,14,-7,15,-7,16,-7,17,-7,18,-7,19,-7,20,-7,21,-7,22,-7,23,-7,24,-7,25,-7,26,-7,27,-7,28,-7,29,-7,30,-7,9,-6,10,-6,11,-6,9,-5,10,-5,9,-4]},
    {central:false,scale:1.25,w:[1.0, 0.1, 0, 0],points:[-25,-18,-24,-18,-23,-18,-22,-18,-21,-18,-20,-18,-19,-18,-18,-18,-17,-18,-16,-18,-15,-18,-14,-18,-13,-18,-12,-18,-11,-18,-10,-18,-9,-18,-8,-18,-7,-18,-6,-18,-5,-18,-4,-18,-3,-18,-2,-18,-1,-18,0,-18,-25,-17,-24,-17,-23,-17,-22,-17,-21,-17,-20,-17,-19,-17,-18,-17,-17,-17,-16,-17,-15,-17,-14,-17,-13,-17,-12,-17,-11,-17,-10,-17,-9,-17,-8,-17,-7,-17,-6,-17,-5,-17,-4,-17,-3,-17,-2,-17,-1,-17,0,-17,-25,-16,-24,-16,-23,-16,-22,-16,-21,-16,-20,-16,-19,-16,-18,-16,-17,-16,-16,-16,-15,-16,-14,-16,-13,-16,-12,-16,-11,-16,-10,-16,-9,-16,-8,-16,-7,-16,-6,-16,-5,-16,-4,-16,-3,-16,-2,-16,-1,-16,0,-16,-25,-15,-24,-15,-23,-15,-22,-15,-21,-15,-20,-15,-19,-15,-18,-15,-17,-15,-16,-15,-15,-15,-14,-15,-12,-15,-11,-15,-10,-15,-9,-15,-8,-15,-7,-15,-6,-15,-5,-15,-4,-15,-3,-15,-2,-15,-1,-15,0,-15,-25,-14,-24,-14,-23,-14,-22,-14,-21,-14,-20,-14,-19,-14,-18,-14,-17,-14,-16,-14,-15,-14,-14,-14,-13,-14,-12,-14,-11,-14,-10,-14,-9,-14,-8,-14,-7,-14,-6,-14,-5,-14,-4,-14,-3,-14,-2,-14,-1,-14,0,-14,-25,-13,-24,-13,-23,-13,-22,-13,-21,-13,-20,-13,-19,-13,-18,-13,-17,-13,-16,-13,-15,-13,-14,-13,-13,-13,-12,-13,-11,-13,-10,-13,-9,-13,-8,-13,-7,-13,-6,-13,-5,-13,-4,-13,-3,-13,-2,-13,-1,-13,0,-13,-16,-12,-15,-12,-14,-12,-13,-12,-12,-12,-11,-12,-10,-12,-9,-12,-8,-12,-7,-12,-6,-12,-5,-12,-4,-12,-3,-12,-2,-12,-1,-12,0,-12,-16,-11,-15,-11,-14,-11,-13,-11,-12,-11,-11,-11,-10,-11,-16,-10,-15,-10,-14,-10,-13,-10,-12,-10,-11,-10,-10,-10,-16,-9,-15,-9,-14,-9,-13,-9,-12,-9,-11,-9,-10,-9]},
    {central:true,scale:0.952,w:[0.2, 1.0, 0, 0],points:[-9,-11,-8,-11,-7,-11,-6,-11,-5,-11,-4,-11,-3,-11,-2,-11,-1,-11,0,-11,1,-11,2,-11,3,-11,4,-11,5,-11,-9,-10,-8,-10,-7,-10,-6,-10,-5,-10,-4,-10,-3,-10,-2,-10,-1,-10,0,-10,1,-10,2,-10,3,-10,4,-10,5,-10,-9,-9,-8,-9,-7,-9,-6,-9,-5,-9,-4,-9,-3,-9,-2,-9,-1,-9,0,-9,1,-9,2,-9,3,-9,4,-9,5,-9,-9,-8,-8,-8,-7,-8,-6,-8,-5,-8,-4,-8,-3,-8,-2,-8,-1,-8,0,-8,1,-8,2,-8,3,-8,4,-8,5,-8,-9,-7,-8,-7,-7,-7,-6,-7,-5,-7,-4,-7,-3,-7,-2,-7,-1,-7,0,-7,1,-7,2,-7,-9,-6,-8,-6,-7,-6,-6,-6,-5,-6,-4,-6,-3,-6,-2,-6,-1,-6,0,-6,1,-6,2,-6,-9,-5,-8,-5,-7,-5,-6,-5,-5,-5,-4,-5,-3,-5,-2,-5,0,-5,1,-5,2,-5,-9,-4,-8,-4,-7,-4,-6,-4,-5,-4,-4,-4,-3,-4,1,-4,2,-4,-8,-3,-7,-3,-6,-3,-5,-3,-4,-3,2,-3]},
    {central:true,scale:1.0,w:[1.0, 0.75, 0.2, 0.5],points:[5,-5,6,-5,5,-4,6,-4,5,-3,6,-3,13,-3,14,-3,15,-3,16,-3,17,-3,5,-2,6,-2,12,-2,13,-2,14,-2,15,-2,16,-2,17,-2,-1,-1,5,-1,6,-1,11,-1,12,-1,13,-1,14,-1,15,-1,16,-1,17,-1,-1,0,0,0,5,0,6,0,10,0,11,0,12,0,13,0,14,0,15,0,16,0,17,0,-1,1,0,1,1,1,2,1,3,1,4,1,5,1,6,1,7,1,8,1,9,1,10,1,11,1,12,1,13,1,14,1,15,1,16,1,17,1,-1,2,0,2,1,2,2,2,3,2,4,2,5,2,6,2,7,2,8,2,9,2,10,2,11,2,12,2,13,2,14,2,15,2,16,2,17,2,-1,3,0,3,1,3,2,3,3,3,4,3,5,3,6,3,7,3,8,3,9,3,10,3,11,3,12,3,13,3,14,3,15,3,16,3,17,3,-1,4,0,4,1,4,2,4,3,4,4,4,5,4,6,4,7,4,8,4,9,4,10,4,11,4,12,4,13,4,14,4,15,4,16,4,17,4,-1,5,0,5,1,5,2,5,3,5,4,5,5,5,6,5,7,5,8,5,9,5,10,5,11,5,12,5,13,5,14,5,15,5,16,5,17,5,-1,6,0,6,1,6,2,6,3,6,4,6,5,6,6,6,7,6,8,6,9,6,10,6,11,6,12,6,13,6,14,6,15,6,16,6,17,6,-1,7,0,7,1,7,2,7,3,7,4,7,5,7,6,7,7,7,8,7,9,7,10,7,11,7,12,7,13,7,14,7,15,7,16,7,17,7]},
    {central:false,scale:1.25,w:[1.0, 0.5, 0, 1.0],points:[18,-3,19,-3,20,-3,21,-3,22,-3,23,-3,24,-3,25,-3,26,-3,27,-3,28,-3,29,-3,30,-3,18,-2,19,-2,20,-2,21,-2,22,-2,23,-2,24,-2,25,-2,26,-2,27,-2,28,-2,29,-2,30,-2,18,-1,19,-1,20,-1,21,-1,22,-1,23,-1,24,-1,25,-1,26,-1,27,-1,28,-1,29,-1,30,-1,18,0,19,0,20,0,21,0,22,0,23,0,24,0,25,0,26,0,27,0,28,0,29,0,30,0,18,1,19,1,20,1,21,1,22,1,23,1,24,1,25,1,26,1,27,1,28,1,29,1,30,1,18,2,19,2,20,2,21,2,22,2,23,2,24,2,25,2,26,2,27,2,28,2,29,2,30,2,18,3,19,3,20,3,21,3,22,3,23,3,24,3,25,3,26,3,27,3,28,3,29,3,30,3,18,4,19,4,20,4,21,4,22,4,23,4,24,4,25,4,26,4,27,4,28,4,29,4,30,4,18,5,19,5,20,5,21,5,22,5,23,5,24,5,25,5,26,5,27,5,28,5,29,5,30,5,18,6,19,6,20,6,21,6,22,6,23,6,24,6,25,6,26,6,27,6,28,6,29,6,30,6,18,7,19,7,20,7,21,7,22,7,23,7,24,7,25,7,26,7,27,7,28,7,29,7,30,7,2,8,3,8,4,8,5,8,6,8,7,8,8,8,9,8,10,8,11,8,12,8,13,8,14,8,15,8,16,8,17,8,18,8,19,8,20,8,21,8,22,8,23,8,24,8,25,8,26,8,27,8,28,8,29,8,30,8,2,9,3,9,4,9,5,9,6,9,7,9,8,9,9,9,10,9,11,9,12,9,13,9,14,9,15,9,16,9,17,9,18,9,19,9,20,9,21,9,22,9,23,9,24,9,25,9,26,9,27,9,28,9,29,9,30,9,2,10,3,10,4,10,5,10,6,10,7,10,8,10,9,10,10,10,11,10,12,10,13,10,14,10,15,10,16,10,17,10,18,10,19,10,20,10,21,10,22,10,23,10,24,10,25,10,26,10,27,10,28,10,29,10,30,10,2,11,3,11,4,11,5,11,6,11,7,11,8,11,9,11,10,11,11,11,12,11,13,11,14,11,15,11,16,11,17,11,18,11,19,11,20,11,21,11,22,11,23,11,24,11,25,11,26,11,27,11,28,11,29,11,30,11,2,12,3,12,4,12,5,12,6,12,7,12,8,12,9,12,10,12,11,12,12,12,13,12,14,12,15,12,16,12,17,12,18,12,19,12,20,12,21,12,22,12,23,12,24,12,25,12,26,12,27,12,28,12,29,12,30,12,2,13,3,13,4,13,5,13,6,13,7,13,8,13,9,13,10,13,11,13,12,13,13,13,14,13,15,13,16,13,17,13,18,13,19,13,20,13,21,13,22,13,23,13,24,13,25,13,26,13,27,13,28,13,29,13,30,13,2,14,3,14,4,14,5,14,6,14,7,14,8,14,9,14,10,14,11,14,12,14,13,14,14,14,15,14,16,14,17,14,18,14,19,14,20,14,21,14,22,14,23,14,24,14,25,14,26,14,27,14,28,14,29,14,30,14,2,15,3,15,4,15,5,15,6,15,7,15,8,15,9,15,10,15,11,15,12,15,13,15,14,15,15,15,16,15,17,15,18,15,19,15,20,15,21,15,22,15,23,15,24,15,25,15,26,15,27,15,28,15,29,15,30,15,2,16,3,16,4,16,5,16,6,16,7,16,8,16,9,16,10,16,11,16,12,16,13,16,14,16,15,16,16,16,17,16,18,16,19,16,20,16,21,16,22,16,23,16,24,16,25,16,26,16,27,16,28,16,29,16,30,16,2,17,3,17,4,17,5,17,6,17,7,17,8,17,9,17,10,17,11,17,12,17,13,17,14,17,15,17,16,17,17,17,18,17,19,17,20,17,21,17,22,17,23,17,24,17,25,17,26,17,27,17,28,17,29,17,30,17,2,18,3,18,4,18,5,18,6,18,7,18,8,18,9,18,10,18,11,18,12,18,13,18,14,18,15,18,16,18,17,18,18,18,19,18,20,18,21,18,22,18,23,18,24,18,25,18,26,18,27,18,28,18,29,18,30,18,2,19,3,19,4,19,5,19,6,19,7,19,8,19,9,19,10,19,11,19,12,19,13,19,14,19,15,19,16,19,17,19,18,19,19,19,20,19,21,19,22,19,23,19,24,19,25,19,26,19,27,19,28,19,29,19,30,19,2,20,3,20,4,20,5,20,6,20,7,20,8,20,9,20,10,20,11,20,12,20,13,20,14,20,15,20,16,20,17,20,18,20,19,20,20,20,21,20,22,20,23,20,24,20,25,20,26,20,27,20,28,20,29,20,30,20,2,21,3,21,4,21,5,21,6,21,7,21,8,21,9,21,10,21,11,21,12,21,13,21,14,21,15,21,16,21,17,21,18,21,19,21,20,21,21,21,22,21,23,21,24,21,25,21,26,21,27,21,28,21,29,21,30,21,2,22,3,22,4,22,5,22,6,22,7,22,8,22,9,22,10,22,11,22,12,22,13,22,14,22,15,22,16,22,17,22,18,22,19,22,20,22,21,22,22,22,23,22,24,22,25,22,26,22,27,22,28,22,29,22,30,22,2,23,3,23,4,23,5,23,6,23,7,23,8,23,9,23,10,23,11,23,12,23,13,23,14,23,15,23,16,23,17,23,18,23,19,23,20,23,21,23,22,23,23,23,24,23,25,23,26,23,27,23,28,23,29,23,30,23,2,24,3,24,4,24,5,24,6,24,7,24,8,24,9,24,10,24,11,24,12,24,13,24,14,24,15,24,16,24,17,24,18,24,19,24,20,24,21,24,22,24,23,24,24,24,25,24,26,24,27,24,28,24,29,24,30,24]},
    {central:false,scale:1.333,w:[1.0, 0.5, 0, 1.0],points:[-27,8,-26,8,-25,8,-24,8,-23,8,-22,8,-21,8,-20,8,-19,8,-18,8,-17,8,-16,8,-15,8,-14,8,-13,8,-12,8,-11,8,-10,8,-9,8,-8,8,-7,8,-6,8,-5,8,-4,8,-3,8,-2,8,-1,8,0,8,1,8,-27,9,-26,9,-25,9,-24,9,-23,9,-22,9,-21,9,-20,9,-19,9,-18,9,-17,9,-16,9,-15,9,-14,9,-13,9,-12,9,-11,9,-10,9,-9,9,-8,9,-7,9,-6,9,-5,9,-4,9,-3,9,-2,9,-1,9,0,9,1,9,-27,10,-26,10,-25,10,-24,10,-23,10,-22,10,-21,10,-20,10,-19,10,-18,10,-17,10,-16,10,-15,10,-14,10,-13,10,-12,10,-11,10,-10,10,-9,10,-8,10,-7,10,-6,10,-5,10,-4,10,-3,10,-2,10,-1,10,0,10,1,10,-27,11,-26,11,-25,11,-24,11,-23,11,-22,11,-21,11,-20,11,-19,11,-18,11,-17,11,-16,11,-15,11,-14,11,-13,11,-12,11,-11,11,-10,11,-9,11,-8,11,-7,11,-6,11,-5,11,-4,11,-3,11,-2,11,-1,11,0,11,1,11,-27,12,-26,12,-25,12,-24,12,-23,12,-22,12,-21,12,-20,12,-19,12,-18,12,-17,12,-16,12,-15,12,-14,12,-13,12,-12,12,-11,12,-10,12,-9,12,-8,12,-7,12,-6,12,-5,12,-4,12,-3,12,-2,12,-1,12,0,12,1,12,-27,13,-26,13,-25,13,-24,13,-23,13,-22,13,-21,13,-20,13,-19,13,-18,13,-17,13,-16,13,-15,13,-14,13,-13,13,-12,13,-11,13,-10,13,-9,13,-8,13,-7,13,-6,13,-5,13,-4,13,-3,13,-2,13,-1,13,0,13,1,13,-27,14,-26,14,-25,14,-24,14,-23,14,-22,14,-21,14,-20,14,-19,14,-18,14,-17,14,-16,14,-15,14,-14,14,-13,14,-12,14,-11,14,-10,14,-9,14,-8,14,-7,14,-6,14,-5,14,-4,14,-3,14,-2,14,-1,14,0,14,1,14,-27,15,-26,15,-25,15,-24,15,-23,15,-22,15,-21,15,-20,15,-19,15,-18,15,-17,15,-16,15,-15,15,-14,15,-13,15,-12,15,-11,15,-10,15,-9,15,-8,15,-7,15,-6,15,-5,15,-4,15,-3,15,-2,15,-1,15,0,15,1,15,-27,16,-26,16,-25,16,-24,16,-23,16,-22,16,-21,16,-20,16,-19,16,-18,16,-17,16,-16,16,-15,16,-14,16,-13,16,-12,16,-11,16,-10,16,-9,16,-8,16,-7,16,-6,16,-5,16,-4,16,-3,16,-2,16,-1,16,0,16,1,16,-27,17,-26,17,-25,17,-24,17,-23,17,-22,17,-21,17,-20,17,-19,17,-18,17,-17,17,-16,17,-15,17,-14,17,-13,17,-12,17,-11,17,-10,17,-9,17,-8,17,-7,17,-6,17,-5,17,-4,17,-3,17,-2,17,-1,17,0,17,1,17,-27,18,-26,18,-25,18,-24,18,-23,18,-22,18,-21,18,-20,18,-19,18,-18,18,-17,18,-16,18,-15,18,-14,18,-13,18,-12,18,-11,18,-10,18,-9,18,-8,18,-7,18,-6,18,-5,18,-4,18,-3,18,-2,18,-1,18,0,18,1,18,-27,19,-26,19,-25,19,-24,19,-23,19,-22,19,-21,19,-20,19,-19,19,-18,19,-17,19,-16,19,-15,19,-14,19,-13,19,-12,19,-11,19,-10,19,-9,19,-8,19,-7,19,-6,19,-5,19,-4,19,-3,19,-2,19,-1,19,0,19,1,19,-27,20,-26,20,-25,20,-24,20,-23,20,-22,20,-21,20,-20,20,-19,20,-18,20,-17,20,-16,20,-15,20,-14,20,-13,20,-12,20,-11,20,-10,20,-9,20,-8,20,-7,20,-6,20,-5,20,-4,20,-3,20,-2,20,-1,20,0,20,1,20,-27,21,-26,21,-25,21,-24,21,-23,21,-22,21,-21,21,-20,21,-19,21,-18,21,-17,21,-16,21,-15,21,-14,21,-13,21,-12,21,-11,21,-10,21,-9,21,-8,21,-7,21,-6,21,-5,21,-4,21,-3,21,-2,21,-1,21,0,21,1,21,-27,22,-26,22,-25,22,-24,22,-23,22,-22,22,-21,22,-20,22,-19,22,-18,22,-17,22,-16,22,-15,22,-14,22,-13,22,-12,22,-11,22,-10,22,-9,22,-8,22,-7,22,-6,22,-5,22,-4,22,-3,22,-2,22,-1,22,0,22,1,22,-27,23,-26,23,-25,23,-24,23,-23,23,-22,23,-21,23,-20,23,-19,23,-18,23,-17,23,-16,23,-15,23,-14,23,-13,23,-12,23,-11,23,-10,23,-9,23,-8,23,-7,23,-6,23,-5,23,-4,23,-3,23,-2,23,-1,23,0,23,1,23,-27,24,-26,24,-25,24,-24,24,-23,24,-22,24,-21,24,-20,24,-19,24,-18,24,-17,24,-16,24,-15,24,-14,24,-13,24,-12,24,-11,24,-10,24,-9,24,-8,24,-7,24,-6,24,-5,24,-4,24,-3,24,-2,24,-1,24,0,24,1,24]},
    {central:false,scale:0.909,w:[0.2, 1.0, 0.4, 0.5],points:[-25,-10,-24,-10,-23,-10,-22,-10,-21,-10,-20,-10,-25,-9,-24,-9,-23,-9,-22,-9,-21,-9,-20,-9,-25,-8,-24,-8,-23,-8,-22,-8,-21,-8,-20,-8,-25,-7,-24,-7,-23,-7,-22,-7,-21,-7,-20,-7,-25,-6,-24,-6,-23,-6,-22,-6,-21,-6,-20,-6,-25,-5,-24,-5,-23,-5,-22,-5,-21,-5,-20,-5,-19,-5,-18,-5,-17,-5,-16,-5,-15,-5,-14,-5,-13,-5,-12,-5,-25,-4,-24,-4,-23,-4,-22,-4,-21,-4,-20,-4,-19,-4,-18,-4,-17,-4,-16,-4,-15,-4,-14,-4,-13,-4,-12,-4,-26,-3,-25,-3,-24,-3,-23,-3,-22,-3,-21,-3,-20,-3,-19,-3,-18,-3,-17,-3,-16,-3,-15,-3,-14,-3,-13,-3,-12,-3,-27,-2,-26,-2,-25,-2,-24,-2,-23,-2,-22,-2,-21,-2,-20,-2,-19,-2,-18,-2,-17,-2,-16,-2,-15,-2,-14,-2,-13,-2,-12,-2,-27,-1,-26,-1,-25,-1,-24,-1,-23,-1,-22,-1,-21,-1,-20,-1,-19,-1,-18,-1,-17,-1,-16,-1,-15,-1,-14,-1,-13,-1,-12,-1,-27,0,-26,0,-25,0,-24,0,-23,0,-22,0,-21,0,-20,0,-19,0,-18,0,-17,0,-16,0,-15,0,-14,0,-13,0,-12,0,-27,1,-26,1,-25,1,-24,1,-23,1,-22,1,-21,1,-20,1,-19,1,-18,1,-17,1,-16,1,-15,1,-14,1,-13,1,-12,1,-27,2,-26,2,-25,2,-24,2,-23,2,-22,2,-21,2,-20,2,-19,2,-18,2,-17,2,-16,2,-15,2,-14,2,-13,2,-12,2,-27,3,-26,3,-25,3,-24,3,-23,3,-22,3,-21,3,-20,3,-19,3,-18,3,-17,3,-16,3,-15,3,-14,3,-13,3,-12,3,-27,4,-26,4,-25,4,-24,4,-23,4,-22,4,-21,4,-20,4,-19,4,-18,4,-17,4,-16,4,-15,4,-14,4,-13,4,-12,4,-27,5,-26,5,-25,5,-24,5,-23,5,-22,5,-21,5,-20,5,-19,5,-18,5,-17,5,-16,5,-15,5,-14,5,-13,5,-12,5,-27,6,-26,6,-25,6,-24,6,-23,6,-22,6,-21,6,-20,6,-19,6,-18,6,-17,6,-16,6,-15,6,-14,6,-13,6,-12,6,-27,7,-26,7,-25,7,-24,7,-23,7,-22,7,-21,7,-20,7,-19,7,-18,7,-17,7,-16,7,-15,7,-14,7,-13,7,-12,7]},
    {central:true,scale:0.87,w:[0, 0.4, 1.0, 0.75],points:[-11,0,-2,0,-11,1,-10,1,-9,1,-8,1,-7,1,-6,1,-5,1,-4,1,-3,1,-2,1,-11,2,-10,2,-9,2,-8,2,-7,2,-6,2,-5,2,-4,2,-3,2,-2,2,-11,3,-10,3,-9,3,-8,3,-7,3,-6,3,-5,3,-4,3,-3,3,-2,3,-11,4,-10,4,-9,4,-8,4,-7,4,-6,4,-5,4,-4,4,-3,4,-2,4,-11,5,-10,5,-9,5,-8,5,-7,5,-6,5,-5,5,-4,5,-3,5,-2,5,-11,6,-10,6,-9,6,-8,6,-7,6,-6,6,-5,6,-4,6,-3,6,-2,6,-11,7,-10,7,-9,7,-8,7,-7,7,-6,7,-5,7,-4,7,-3,7,-2,7]},
  ],
};
const londonOrigin = [150,-50]; // 原版坐标 (150,-50) 对应网页画面中心 (480,285)
const londonWeb = ([x,y]) => ({x:480+(x-londonOrigin[0])*unit, y:285-(y-londonOrigin[1])*unit});
// shortcut: 河道的直角拐点画成 11 像素宽的陡斜段，使河道仍是 y=f(x)，沿用现有过河判定。
const londonRiver = londonMap.river.map(londonWeb).reduce((out,point) => {
  const last=out.at(-1);
  out.push([last && point.x<=last[0] ? last[0]+11 : point.x,point.y]);
  return out;
},[]);
const londonStart = [[-250,150],[50,-300],[550,100]].map(point => {const {x,y}=londonWeb(point);return [x,y];});
const londonGrid = londonMap.areas.flatMap(({central},area) => {
  const cells=[], {points}=londonMap.areas[area];
  for (let i=0;i<points.length;i+=2) cells.push({...londonWeb([points[i]*50,points[i+1]*50]),central,area});
  return cells;
});
// 起始站所在区域的密度系数；站点不在格点上时取 1。
const londonScale = (x,y) => londonMap.areas[londonGrid.find(cell => cell.x===x && cell.y===y)?.area]?.scale ?? 1;
const cities = {
  London: {name:'伦敦', real:true, bandHalf:20*unit, zoomEnd:.5, zoomSpan:960, river:londonRiver, start:londonStart},
  Paris: {name:'巴黎', stationCapacity:4, stationGap:22.4, stationSpacingScale:.8,
    river:[[0,217],[149,215],[278,265],[438,326],[565,326],[727,243],[960,260]], start:[[340,227],[477,372],[614,249]]},
  NewYork: {name:'纽约', vertical:true, river:[[0,485],[100,456],[200,419],[300,387],[400,352],[500,310],[570,279]],
    eastRiver:[[0,668],[85,630],[175,592],[255,574],[325,601],[415,524],[485,461],[570,395]], start:[[352,228],[495,329],[655,235]]},
};
const days = ['一','二','三','四','五','六','日'];
const types = ['圆形','三角形','方形','菱形','星形','五边形','十字形'];
// 原版数值取自 Unity 构建：Constants 类的 const 字段（IL2CPP 元数据）和 Default 配置的机车参数。
// 原版配置里的线宽为 6，网页同位置为 3.72，所以网页地图单位 = 原版单位 × 0.62。
const dayDuration = 20;
const weekDuration = dayDuration*7;
const departureDelay = .8, interchangeLoadScale = .5, interchangeScale = 1.35, spawnBoostCooldown = 6;
let nextSpawnBoost = 0;
const terminator = {length:54*unit, width:39.15*unit, bar:8.5*unit}, cornerRadius = 24*unit;
// 车厢 26 宽（DEFAULT_RAILCAR_WIDTH）、沿轨约 39 长，车内乘客 0.75 倍、间距 13。
// 长度和车厢中心距按原版截图量得（约 39 与 45.5），是估计值，RAILCAR_SPACING=32.5 与截图对不上。
const routeWidth = 12*unit, railcar = {length:39*unit, width:26*unit, peep:.75, gap:13*unit}, railcarSpacing = 45.5*unit;
const peepRadius = 15*unit/2, peepGap = {x:18*unit,y:20*unit}, peepOffset = {x:32*unit,y:10*unit};
const stationSpacing = {central:180*unit, suburb:100*unit, centralRadius:150*unit};
// 操作判定，取自原版 Constants：车站触控 50、缓冲 10，聚焦缓冲 20，手机缓冲 10，线路点击 10 和触控 25，
// 终端点击 20 和触控 30，车厢触控扩展 20，拖动阈值 5 像素（Game.TouchMovementThreshold）。
const reach = {
  station:(50/2+10)*unit, focus:20*unit, phone:10*unit, route:10*unit+12*unit/2, routeTouch:25*unit+12*unit/2,
  terminator:20*unit, terminatorTouch:30*unit, assetDrop:30*unit, car:(26/2+10)*unit, carTouch:(26/2+10+20)*unit, moveThreshold:5,
};
let touchInput = false;
// 未连线提示：车站出现后 8 秒（UNCONNECTED_STATION_WARNING_TIMER）仍没接入线路，先出现几秒旋转的虚线圈，
// 再出现一个越长越大的浅灰圆盘，最大约 7 倍站半径；按下或拖到某站时该站周围也是同样的虚线圈。
// 圈与圆盘的大小、淡入时长按试玩构建的截图估算。
const peepRows = 4;
const unconnectedWarning = 8, attentionRing = 52*unit;
// 操作提示，等待时间取自 TipSystem：没有线路时 5 秒无操作提示拖线，车站 10 秒没接入时提示延长线路。
// 提示是深灰圆角胶囊，沿 45 度斜线排布：起点站的胶囊向左下，目标站的胶囊向右上（试玩构建）。
// 胶囊尺寸与字号按截图估算，文字为中文。
const tipTiming = {build:5, unconnected:10};
// 常规局的乘客生成节奏。真实 Chrome 里逐秒截图，开局不连线时累计乘客约为 30 秒 6 位、60 秒 15 位、100 秒 32 位，
// 此前的节奏（3.2）约快 1.7 倍，放慢到 5.3 后与三个数据点相符；100 秒之后的速率没有测。
const passengerPace = 5.3;
let lastTouch = 0;
const stationGrid = 50*unit, stationPreview = 20, stationPreviewRadius = 36*unit/2*.3, maxStations = 128;
const trainTuning = {speed:130*unit, acceleration:55*unit, braking:110*unit};
const scenicMilestones=[4,8,13,19,24,27,33,36,39,43,47,52,56,60,65,75,90];
let recentTrips, scenicMilestone, nextEfficiency;
const overloadLimit = 45;
const overloadGrace = 2, weekGrace = 5;
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
let collapseStation = null, newBest = false;
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
let focusedLine = null;
let assetDrag = null, vehicleDrag=null;
let time, nextStation, nextPassenger, week, score, paused, speed, phase, selected, drag;
let view = {x:0,y:0,scale:1};
let feedback = '';
let feedbackUntil = 0;
let lastFrame = 0;
const savedGameKey='metro-saved-game-v1';
let parkedGame=false;
let parkedSaveWritten=false;

function bestScore() {
  try { return Number(localStorage.getItem('metro-best-' + cityKey + '-' + mode)) || 0; }
  catch { return 0; }
}

function reset(key) {
  cityKey = key;
  const capacity=cities[key].stationCapacity ?? 6;
  applyNight(night);
  collapseStation = null;
  lesson=null;
  eligibleExtreme=true;
  upcomingStation=undefined;
  document.documentElement.removeAttribute('data-lesson');
  $('city').textContent = cities[key].name;
  stations = cities[key].start.map(([x,y], type) => cities[key].real
    ? {x,y,type,waiting:[],pressure:0,capacity,born:-1,centrality:londonScale(x,y)}
    : {x:x+Math.random()*32-16,y:y+Math.random()*12-6,type,waiting:[],pressure:0,capacity,born:-1});
  lines = colors.map(() => []);
  trains = [];
  retiring = [];
  highlightUntil = 0;
  focusedLine = null;
  setToolbarExpanded(true);
  inventory = {lines:3, trains:3, cars:0, crossings:3, interchanges:0}; // 开局 3 个过河通道（试玩构建里前三次跨河都被接受）
  if (mode==='creative') enableCreative();
  time = score = selected = 0;
  recentTrips=[];
  scenicMilestone=0;
  nextEfficiency=scenicMilestones[0];
  history=[];
  daily={trips:0, distance:0, waiting:0, transfers:0};
  sampleStatistics();
  scheduleIndex = specialsSpawned = 0; stationQueue = []; specialPool = []; stationGap = cities[key].stationGap ?? spawnSchedules[0].gap;
  nextStation = stationGap/2; nextSpawnBoost = 0; lastTouch = 0;
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
  updateCamera();
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

function waterDistance(point,city) {
  if (city.real) {
    let best=Infinity;
    for (let i=1;i<city.river.length;i++) {
      const [ax,ay]=city.river[i-1], [bx,by]=city.river[i];
      const dx=bx-ax, dy=by-ay;
      const t=Math.max(0,Math.min(1,((point.x-ax)*dx+(point.y-ay)*dy)/(dx*dx+dy*dy)));
      best=Math.min(best,Math.hypot(point.x-ax-t*dx,point.y-ay-t*dy));
    }
    return best;
  }
  const position=riverCoordinates(point,city);
  return Math.min(...waterways(city).map(river => Math.abs(position.y-riverY(position.x,river))));
}

function riverCoordinates(point,city) {
  return city.vertical ? {x:point.y,y:point.x} : point;
}

// 两站之间的连线由一段直线和一段 45 度斜线组成。默认从左侧的站出发先走斜线；延长线路时，
// 若给出进入方向，就选第一段与进入方向夹角更小的走法，使线路在车站处更平滑。
// shortcut: 原版 ProximityToMatchIncomingDirection 为 65，网页没有这个距离门槛，总是取转角更小的一种。
function pathBetween(a,b,incoming=null,bendChoice) {
  const dx = b.x-a.x, dy = b.y-a.y, ax = Math.abs(dx), ay = Math.abs(dy);
  const diagonal = Math.min(ax,ay), straight = Math.max(ax,ay)-diagonal;
  const diagonalBend = {x:a.x + Math.sign(dx)*diagonal, y:a.y + Math.sign(dy)*diagonal};
  if (!diagonal || !straight) return [a,diagonalBend,b];
  const straightBend = ax>ay ? {x:a.x+Math.sign(dx)*straight,y:a.y} : {x:a.x,y:a.y+Math.sign(dy)*straight};
  const leftFirst = !(a.x > b.x || (a.x === b.x && a.y > b.y));
  let diagonalFirst = leftFirst;
  if (incoming) {
    const turn = bend => {
      const length=distance(a,bend);
      return (bend.x-a.x)*incoming.x/length+(bend.y-a.y)*incoming.y/length;
    };
    const gain = turn(diagonalBend)-turn(straightBend);
    if (Math.abs(gain)>1e-6) diagonalFirst = gain>0;
  }
  return [a,(bendChoice ?? diagonalFirst) ? diagonalBend : straightBend,b];
}

function looped(route) {
  return route.length >= 4 && route[0] === route.at(-1);
}

function routeSize(route) { return route.length - Number(looped(route)); }

function stepIndex(route, stop, direction) {
  const size = routeSize(route);
  return looped(route) ? (stop+direction+size)%size : stop+direction;
}

function crossings(route,paths=route.length>1 ? linkPaths(route).forward : []) {
  const city=cities[cityKey];
  let total = 0;
  for (let i=1;i<route.length;i++) {
    const points=paths[i-1].map(p => riverCoordinates(p,city));
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
      total+=crossings([train.from,train.to],[train.points]);
    }
    return total;
  },0);
}

function passenger(type) {
  return {type, queuedAt:time, waiting:0, distance:0, boardings:0};
}

// shortcut: 原版音效与配乐有版权，无法取得；这里用 Web Audio 合成近似的柔和五声音阶，要更接近原版需换成自带采样。
let sound=true, audio, lastNote=0;
try {sound=localStorage.getItem('metro-sound')!=='false';} catch {}
const pentatonic=[262,294,330,392,440,523,587,659];
function tone(freq,delay=0,length=.6,volume=.06) {
  if (!sound) return;
  try {
    audio??=new AudioContext();
    if (audio.state==='suspended') audio.resume();
    const t=audio.currentTime+delay, osc=audio.createOscillator(), gain=audio.createGain();
    osc.frequency.value=freq;
    gain.gain.setValueAtTime(0,t);
    gain.gain.linearRampToValueAtTime(volume,t+.01);
    gain.gain.exponentialRampToValueAtTime(.0001,t+length);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);osc.stop(t+length);
  } catch {}
}
// shortcut: 背景音是随机的长音垫（只在 simulate 运行时发声，暂停即静音），不是原版那样的编曲。
let nextAmbient=0;
function ambient() {
  const now=performance.now();
  if (now<nextAmbient) return;
  nextAmbient=now+2500+Math.random()*3500;
  const f=pentatonic[Math.random()*5|0]/2;
  tone(f,0,5,.025);
  if (Math.random()<.4) tone(f*1.5,.4,5,.015);
}
const chord=(notes,gap,length,volume) => notes.forEach((f,i) => tone(f,i*gap,length,volume));

function deliver(rider) {
  const now=performance.now();
  if (now-lastNote>80) {lastNote=now;tone(pentatonic[Math.random()*pentatonic.length|0]);}
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

function setRoute(index, route, split=null) {
  if (route.length<2) route=[];
  const old=lines[index];
  if (old.bends) {
    const bends={};
    for (let i=1;i<route.length;i++) {
      const key=edgeKey(route[i-1],route[i]);
      if (Object.hasOwn(old.bends,key)) bends[key]=old.bends[key];
    }
    if (Object.keys(bends).length) route.bends=bends;
  }
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
    if (!direction && split && (from===split.from && to===split.to || from===split.to && to===split.from)) {
      const forward=from===split.from;
      const boundary=forward ? split.progress : split.length-split.progress;
      const before=train.progress<=boundary;
      const fraction=before ? train.progress/boundary : (train.progress-boundary)/(split.length-boundary);
      return {train,from,stop:before ? stop : route.indexOf(split.station),direction:forward ? 1 : -1,fraction};
    }
    return {train,from,to,stop,direction};
  });
  const deferred=assignments.filter(({train,direction}) => !direction && train.progress>0).map(({train,from,to}) => ({
    ...train, from, to, points:lineTrack(from,to,index),
  }));
  if (deferred.length) {
    const replacementEdges=indexTracks([route]), removed=[];
    for (let i=1;i<old.length;i++) {
      const from=old[i-1], to=old[i];
      if (!replacementEdges.has(edgeKey(from,to))) removed.push({from,to,points:lineTrack(from,to,index)});
    }
    for (const train of deferred) train.removedTracks=removed;
  }
  const pending=retiring.concat(deferred);
  if (usedCrossings(index,route,pending)>inventory.crossings) {
    notify('过河通道已用完。拆除一条已有通道，或在本周末选择更多通道。');
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
      train.dwell=dwellAt(route[stop]);
      continue;
    }
    if (!train.progress) returnStock(train);
    trains.splice(trains.indexOf(train),1);
  }
  lines[index]=route;
  rebuildTracks();
  for (const {train,fraction} of assignments) {
    if (fraction===undefined) continue;
    const next=stepIndex(route,train.stop,train.direction);
    train.progress=Math.min(1,Math.max(0,fraction))*trackLength(lineTrack(route[train.stop],route[next],index));
  }
  recordReplay();
  dispatchIfEmpty(index);
  highlightUntil=performance.now()+1500;
  updateLines();
  updateHUD();
  return true;
}

// shortcut: 原版 LOAD_TIME_SCALE_PER_UPGRADE 只缩上下客时间，网页上下客瞬时，故整段停站按它缩放。
function dwellAt(id) {return departureDelay*(stations[id].capacity>6 ? interchangeLoadScale : 1);}

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
  lines=lines.map(route => {
    const mapped=route.map(station => station>id ? station-1 : station);
    if (route.bends) {
      mapped.bends={};
      for (let i=1;i<route.length;i++) {
        const key=edgeKey(route[i-1],route[i]);
        if (Object.hasOwn(route.bends,key)) mapped.bends[edgeKey(mapped[i-1],mapped[i])]=route.bends[key];
      }
    }
    return mapped;
  });
  retiring.forEach(train => {
    if (train.removedTracks) {
      train.removedTracks=train.removedTracks.filter(track => track.from!==id && track.to!==id)
        .map(({from,to,points}) => ({from:from>id ? from-1 : from,to:to>id ? to-1 : to,points}));
    }
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
  if (waterDistance(point,cities[cityKey])<19) {
    notify('请在陆地上放置车站');
    return;
  }
  stations.push({...point,type:0,capacity:cities[cityKey].stationCapacity ?? 6,waiting:[],pressure:0,born:time,demand:1});
  recordReplay();
  editCreativeStation(stations.length-1);
}

function departureFromDrop(line,{index,progress}) {
  const route=lines[line], from=route[index-1], to=route[index];
  const forward=progress<=trackLength(lineTrack(from,to,line))/2;
  const stop=forward ? index-1 : index%routeSize(route);
  return {stop,direction:forward ? 1 : -1,progress:0,velocity:0,dwell:dwellAt(route[stop])};
}

function addTrain(line,placement=null) {
  if (!inventory.trains || !lines[line].length) return;
  const existing = trains.filter(t => t.line === line).length;
  if (existing >= trainLimit()) return;
  const stop=existing%2 ? routeSize(lines[line])-1 : 0;
  const departure=placement ? departureFromDrop(line,placement) : {
    stop,direction:stop===0 ? 1 : -1,progress:0,velocity:0,dwell:.6+Math.floor(existing/2)*2,
  };
  trains.push({line,...departure,riders:[],cars:0,born:time});
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
  train.carBorn=time;
  inventory.cars--;
  updateHUD();
}

function travelSeconds(length,velocity=0) {
  const {acceleration,braking,speed:limit}=trainTuning;
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
    firstDeparture=travelSeconds(Math.max(0,trackLength(track)-train.progress),train.velocity)+dwellAt(route[stepIndex(route,stop,direction)]);
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
    period+=travel+dwellAt(to);
  }
  return {train,events,period};
}

function passengerChoices(origin,departing=null,replaced=departing) {
  const arrivals=stations.map(() => Infinity);
  const firstTrain=stations.map(() => null);
  const laterDeparture=Symbol('later departure');
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
          const boardsLater=train===departing && (index!==0 || repetitions!==0);
          firstTrain[next]=firstTrain[station] ?? (boardsLater ? laterDeparture : train);
        }
        if (events[leg].reverses) break;
        arrival+=dwellAt(next);
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
        const tail=Math.min(22+other.cars*railcarSpacing,leg*.5,length/peers.length*.65);
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
  const {speed,acceleration,braking}=trainTuning;
  const target=through ? speed : Math.min(speed,Math.sqrt(2*braking*Math.max(0,remaining)));
  train.velocity=Math.min(target,train.velocity+acceleration*dt);
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
    const brakingDistance=trainTuning.speed**2/(2*trainTuning.braking)+trainTuning.speed*dt+.8;
    if (train.approach===undefined && trackLength(incoming)-train.progress<=brakingDistance) {
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
    train.dwell=dwellAt(route[next]);
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
      cars:train.cars,riders:[],progress:0,velocity:0,dwell:dwellAt(route[stop])});
  }
  lines.forEach((_,index) => dispatchIfEmpty(index));
  updateHUD();
}

function distance(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }

function trackBetween(a,b,incoming=null,bendChoice) {
  const [,bend] = pathBetween(a,b,incoming,bendChoice);
  const first = distance(a,bend), last = distance(bend,b);
  const radius = Math.min(cornerRadius,first/2,last/2);
  if (!radius) return [a,b];
  const start = {x:bend.x+(a.x-bend.x)*radius/first,y:bend.y+(a.y-bend.y)*radius/first};
  const end = {x:bend.x+(b.x-bend.x)*radius/last,y:bend.y+(b.y-bend.y)*radius/last};
  return [a,start,...[.25,.5,.75].map(t => {
    const u = 1-t;
    return {x:u*u*start.x+2*u*t*bend.x+t*t*end.x,y:u*u*start.y+2*u*t*bend.y+t*t*end.y};
  }),end,b];
}

// 沿线路依次生成每段连线，后一段的走法参照前一段的进入方向。
function routePaths(points,ids=[]) {
  const paths=[];
  let incoming=null;
  for (let i=1;i<points.length;i++) {
    const from=ids[i-1], to=ids[i], stored=ids.bends?.[edgeKey(from,to)];
    const bend=stored===undefined ? undefined : (from<to ? stored : !stored);
    const path=trackBetween(points[i-1],points[i],incoming);
    paths.push(bend===undefined ? path : trackBetween(points[i-1],points[i],incoming,bend));
    const end=path.at(-1), before=path.at(-2), length=distance(end,before);
    incoming=length ? {x:(end.x-before.x)/length,y:(end.y-before.y)/length} : null;
  }
  return paths;
}

// 每条线路按自己的进入方向生成连线，结果按线路缓存，车站移动或线路变化时重算。
const pathCache = new WeakMap();
function linkPaths(ids,mapStations=stations) {
  const signature=ids.join();
  const hit=pathCache.get(ids);
  if (hit && hit.signature===signature && hit.stations===mapStations && hit.bends===ids.bends &&
    ids.every((id,i) => mapStations[id]?.x===hit.coords[i*2] && mapStations[id]?.y===hit.coords[i*2+1])) return hit;
  const forward=routePaths(ids.map(id => mapStations[id]),ids);
  const entry={signature,stations:mapStations,bends:ids.bends,coords:ids.flatMap(id => [mapStations[id].x,mapStations[id].y]),
    forward,backward:forward.map(path => [...path].reverse())};
  pathCache.set(ids,entry);
  return entry;
}

// 某条线路在 from 到 to 之间不带偏移的连线；该线路不含这一段时退回默认走法。
function rawTrack(from,to,ids,mapStations) {
  if (ids) {
    const entry=linkPaths(ids,mapStations);
    for (let i=1;i<ids.length;i++) {
      if (ids[i-1]===from && ids[i]===to) return entry.forward[i-1];
      if (ids[i-1]===to && ids[i]===from) return entry.backward[i-1];
    }
  }
  return trackBetween(mapStations[from],mapStations[to]);
}

const samePath = (p,q) => p.length===q.length && p.every((point,i) => Math.abs(point.x-q[i].x)<.01 && Math.abs(point.y-q[i].y)<.01);

// 同一对车站之间的几条线路，只有走法完全相同的才画成偏移的平行线；走法不同（进入方向不同）就各走各的。
function lineTrack(from,to,line,mapStations=stations,mapEdges=edgeLines,allLines=lines) {
  const a=mapStations[from], b=mapStations[to];
  const points=rawTrack(from,to,allLines[line],mapStations);
  const group=mapEdges.get(edgeKey(from,to));
  if (!group || group.length<2) return points;
  const same=group.filter(other => other===line || (allLines[other] && samePath(rawTrack(from,to,allLines[other],mapStations),points)));
  if (same.length<2) return points;
  const offset=(same.indexOf(line)-(same.length-1)/2)*7.7*Math.sign(to-from);
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

function stationSeparationAt(point) {
  const central=distance(point,{x:width/2,y:274})<stationSpacing.centralRadius;
  return (central ? stationSpacing.central : stationSpacing.suburb)*(cities[cityKey].stationSpacingScale ?? 1);
}

// 画面里当前能看到的世界范围，边距取原版 STATION_MARGIN。
function visibleBounds(margin=65*unit) {
  const w=canvas.clientWidth || width, h=canvas.clientHeight || height+75;
  const camera=view ?? cameraView(w,h,time);
  return {x0:-camera.x/camera.scale+margin, x1:(w-camera.x)/camera.scale-margin,
    y0:-camera.y/camera.scale+margin, y1:(h-75-camera.y)/camera.scale-margin};
}

// 站型在 londonMap.areas[].w 里的下标：圆形、三角形、方形、其余为特殊站。
const areaWeightIndex = type => Math.min(type,3);

function findLondonStation(type) {
  const box=visibleBounds(), city=cities[cityKey];
  const open=londonGrid.filter(cell => cell.x>=box.x0 && cell.x<=box.x1 && cell.y>=box.y0 && cell.y<=box.y1 &&
    waterDistance(cell,city)>=30 &&
    !stations.some(s => distance(s,cell)<(cell.central ? stationSpacing.central : stationSpacing.suburb)));
  if (!open.length) return null;
  // 先按该站型在各区域的权重选区域，再在区域内随机选格点；没有符合权重的格点时放宽到所有格点。
  const weight=cell => londonMap.areas[cell.area].w[areaWeightIndex(type)];
  const weighted=open.filter(cell => weight(cell)>0);
  const pool=weighted.length ? weighted : open;
  const areas=[...new Set(pool.map(cell => cell.area))];
  const total=areas.reduce((sum,area) => sum+(weighted.length ? londonMap.areas[area].w[areaWeightIndex(type)] : 1),0);
  let draw=Math.random()*total, chosen=areas[0];
  for (const area of areas) {
    draw-=weighted.length ? londonMap.areas[area].w[areaWeightIndex(type)] : 1;
    if (draw<0) {chosen=area;break;}
  }
  const cells=pool.filter(cell => cell.area===chosen);
  const {x,y,area}=cells[Math.floor(Math.random()*cells.length)];
  return {x,y,centrality:londonMap.areas[area].scale}; // 不带 type：极限模式的预告只显示位置
}

function findStationPosition() {
  if (stations.length>=maxStations) return null;
  const city=cities[cityKey];
  if (city.real) return findLondonStation(peekStationType());
  const spread=Math.min(1,.57+time/360);
  for (let i=0;i<120;i++) {
    const x=Math.round((480+(Math.random()-.5)*748*spread)/stationGrid)*stationGrid, y=Math.round((274+(Math.random()-.5)*323*spread)/stationGrid)*stationGrid;
    if (waterDistance({x,y},city)<29 ||
      stations.some(s => distance(s,{x,y})<stationSeparationAt({x,y}))) continue;
    return {x,y};
  }
  return null;
}

// 伦敦地图数据里的车站生成计划：每个计划是一个类型袋（0 圆形、1 三角形、2 方形，'S' 特殊站）和出站间隔，
// 袋内车站按间隔依次出现，袋空后进入下一个计划，最后一个计划重复。特殊站形状顺序也来自地图数据：
// 五边形、菱形、星形、十字形（原版还有楔形，网页没有这个形状）。实测两局的第一个特殊站分别是五边形和十字形，
// 所以这个顺序不是固定的，网页改为每局随机洗牌、用完再洗。
// 间隔来自在真实 Chrome 里运行伦敦试玩构建的逐秒截图：新站出现在 14、42、70、98、126、154、182、210、238、266 秒，
// 间隔恒为 28 秒（至少测到第 2 周末的 280 秒），首站在半个间隔处，不随袋变化；袋只决定形状顺序。
// 第 12 个站（第二个袋内）是第一个特殊站，正是五边形。280 秒之后的间隔没有测。袋内顺序随机。
const spawnSchedules=[
  {bag:[0,0,0,1,1],gap:28},
  {bag:[0,0,0,0,0,1,1,2,'S'],gap:28},
  {bag:[0,0,0,0,0,1,1,2,'S','S'],gap:28},
];
const specialOrder=[5,3,4,6];
let scheduleIndex=0, specialsSpawned=0, specialPool=[], stationQueue=[], stationGap=spawnSchedules[0].gap;
function refillStationQueue() {
  if (stationQueue.length) return;
  const schedule=spawnSchedules[Math.min(scheduleIndex++,spawnSchedules.length-1)];
  stationQueue=[...schedule.bag].sort(() => Math.random()-.5);
  stationGap=cities[cityKey].stationGap ?? schedule.gap;
}
// 先看下一站的形状（用于按形状选区域），特殊站的具体形状在真正取出时才推进顺序。
function peekStationType() {
  refillStationQueue();
  const pick=stationQueue.at(-1);
  if (pick!=='S') return pick;
  if (!specialPool.length) specialPool=[...specialOrder].sort(() => Math.random()-.5);
  return specialPool.at(-1);
}
function nextStationType() {
  const type=peekStationType();
  if (stationQueue.pop()==='S') {specialsSpawned++;specialPool.pop();}
  return type;
}

function connectStationOnTrack(station) {
  if (mode!=='normal' && mode!=='endless') return;
  const id=stations.length-1;
  for (const [line,route] of lines.entries()) {
    const hit=segmentAt(station,route,line,routeWidth);
    if (hit.index===null) continue;
    const from=route[hit.index-1], to=route[hit.index];
    const length=trackLength(lineTrack(from,to,line));
    if (hit.progress<=routeWidth || length-hit.progress<=routeWidth) continue;
    const updated=route.slice(0,hit.index).concat(id,route.slice(hit.index));
    if (crossings(updated)>crossings(route)) continue;
    setRoute(line,updated,{from,to,station:id,progress:hit.progress,length});
  }
}

function spawnStation(position) {
  if (!position) return;
  const type=nextStationType();
  const station={x:position.x,y:position.y,type,waiting:[],pressure:0,capacity:cities[cityKey].stationCapacity ?? 6,born:time,centrality:position.centrality ?? 1};
  stations.push(station);
  chord([196,262],.12,.8,.05);
  // shortcut: 原版 CityPlanner.PEEP_SPAWN_BOOST_COOLDOWN 只给出 6 秒冷却，网页取"新站立即来一位乘客"。
  if (mode!=='creative' && time>=nextSpawnBoost) {addPassengerAt(station);nextSpawnBoost=time+spawnBoostCooldown;}
  connectStationOnTrack(station);
  recordReplay();
}

function spawnPassenger() {
  const candidates=mode==='endless' ? stations.filter(s => s.waiting.length<s.capacity*2) : stations;
  if (!candidates.length) return;
  // 乘客按车站所在区域的密度系数（原版 centrality）加权，非伦敦的车站系数为 1。
  let draw=Math.random()*candidates.reduce((total,s) => total+(s.centrality ?? 1),0);
  let station=candidates.find(s => (draw-=s.centrality ?? 1)<0) ?? candidates.at(-1);
  if (mode==='creative') {
    const weights=candidates.map(s => s.waiting.length<s.capacity*2 ? s.demand ?? 1 : 0);
    let draw=Math.random()*weights.reduce((total,weight) => total+weight,0);
    station=candidates.find((_,i) => (draw-=weights[i])<0);
    if (!station) return;
  }
  addPassengerAt(station);
}

function addPassengerAt(s) {
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
  chord([262,330,392,523],.12,.9,.05);
  for (const station of stations) {
    if (station.pressure>=overloadLimit-weekGrace) station.expiryLimit=station.pressure+weekGrace;
  }
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
  const decorate=(entries) => {
    [...$('choices').children].forEach((button,i) => {
      const offer=entries[i];
      button.setAttribute('aria-label',offer.label);
      const title=document.createElement('strong');
      title.textContent=offer.label;
      const detail=document.createElement('span');
      detail.className='reward-description';
      detail.textContent=offer.description;
      button.replaceChildren(rewardIcon(offer.symbol,offer.count,offer.color),title,detail);
    });
  };
  const claim=async (offer,button) => {
    if (button.disabled) return false;
    for (const item of $('choices').children) item.disabled=true;
    await animateReward(button.querySelector('.reward-icon'),offer.target);
    offer.apply();
    updateLines();
    updateHUD();
    return true;
  };
  // 原版（试玩构建）的周升级分两步：先领一台机车，再从两项资产里选一项。
  const chooseAsset=() => {
    showPanel('第 '+week+' 周','要为地铁选择哪项新资产？',offers.map(offer => [
      offer.label,async event => {if (await claim(offer,event.currentTarget)) $('screen').close();},
    ]),'','upgrade');
    decorate(offers);
  };
  const locomotive={label:'机车',description:'把机车加到新线路或已有线路。',symbol:'locomotive',target:$('train'),apply:() => {inventory.trains++;}};
  showPanel('第 '+week+' 周','你的地铁获得一台新机车。',[
    [locomotive.label,async event => {if (await claim(locomotive,event.currentTarget)) chooseAsset();}],
  ],'','upgrade');
  decorate([locomotive]);
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
    lines:lines.map(route => Object.assign(route.slice(),{bends:route.bends})),
    bends:lines.map(route => route.bends)};
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
  // 文案按试玩构建的结算：车站拥挤迫使地铁关闭，N 位乘客在 D 天内乘坐了地铁，新纪录时另有一句。
  showPanel('运营结束','该车站的拥挤迫使你的地铁关闭。'+score+' 位乘客在 '+Math.floor(time/dayDuration)+' 天内乘坐了你的地铁。'+
    (newBest ? '这是你的新纪录！' : '最高纪录 '+Math.max(score,bestScore())+' 人。'),[
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

// 教程车站：类型沿用原版教程的顺序，位置放在伦敦地图的中心区，0 到 4 号在河北，5 号在河南。
const lessonStations=[
  [[-100,100],0], [[250,50],2], [[-250,250],1],
  [[550,150],0], [[100,250],1], [[550,-300],0],
].map(([point,type]) => {const {x,y}=londonWeb(point);return [x,y,type];});
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
  nextStation=time+stationGap/2;
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
  ambient();
  if (lesson) {simulateTutorial(dt);return;}
  time += dt;
  if (mode==='extreme' && upcomingStation===undefined && time>=nextStation-stationPreview) upcomingStation=findStationPosition();
  if (mode!=='creative' && time>=nextStation) {
    spawnStation(upcomingStation===undefined ? findStationPosition() : upcomingStation);
    upcomingStation=undefined;
    nextStation+=stationGap;
  }
  if (time>=nextPassenger) {
    spawnPassenger();
    const interval=mode==='endless'
      ? Math.max(.08,(weekDuration/7)/(8+2.8*(stations.length-3)+4*scenicMilestone))
      : mode==='creative' ? Math.max(.25,5/Math.max(1,stations.reduce((total,s) => total+(s.demand ?? 1),0)))
      : Math.max(.8,passengerPace/(1+time/120+stations.length/28));
    nextPassenger+=interval;
  }
  moveTrains(dt);
  const firstRecent=recentTrips.findIndex(trip => trip>time-weekDuration);
  if (firstRecent<0) recentTrips.length=0;
  else if (firstRecent>0) recentTrips.splice(0,firstRecent);
  checkExtremeChallenge();
  const connected=new Set(lines.flat());
  const atStation=new Set(trains.filter(train => train.dwell>0).map(train => lines[train.line][train.stop]));
  stations.forEach((s,id) => {s.idle=connected.has(id) ? 0 : (s.idle ?? 0)+dt;});
  for (const [id,s] of stations.entries()) {
    const overloaded=mode!=='endless' && mode!=='creative' && s.waiting.length>s.capacity;
    if (overloaded && atStation.has(id)) continue;
    s.over=overloaded ? (s.over ?? 0)+dt : 0;
    if (!overloaded) {
      s.pressure=Math.max(0,Math.min(s.pressure,overloadLimit)-dt);
      delete s.expiryLimit;
    } else if (s.pressure>0 || s.over>overloadGrace) {
      s.pressure+=dt;
    }
    if (overloaded && s.pressure>=(s.expiryLimit ?? overloadLimit)) {
      phase = 'ended';
      chord([330,262,220,165],.25,1.2,.07);
      collapseStation = s;
      newBest = score>bestScore();
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
    button.className = 'line';
    button.classList.toggle('built',route.length>0);
    button.style.setProperty('--line',colors[i]);
    button.setAttribute('aria-label','线路 '+(i+1));
    button.setAttribute('aria-pressed',i===selected);
    button.title = '线路 '+(i+1);
    button.onclick = () => {
      selected=i;
      focusedLine=route.length ? i : null;
      highlightUntil=performance.now()+1500;
      $('lines').querySelector('[aria-pressed=true]')?.setAttribute('aria-pressed','false');
      button.setAttribute('aria-pressed','true');
      updateHUD();
    };
    return button;
  }),$('remove'));
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
  if (focusedLine!==selected || !lines[selected].length) focusedLine=null;
  const activeLine=$('lines').children[selected];
  $('lines').querySelector('.focused')?.classList.remove('focused');
  activeLine?.classList.toggle('focused',focusedLine!==null);
  $('remove').hidden=focusedLine===null || mode==='extreme';
  if (!$('remove').hidden) $('remove').style.setProperty('--remove-x','calc(var(--line-slot) * '+selected+')');
  $('crossingCount').textContent = mode==='creative' ? '∞' : inventory.crossings-usedCrossings();
  $('hint').textContent = lesson ? lessonHints[lesson.stage] :
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
  parkedGame=false;
  mode = gameMode;
  reset(key);
  $('screen').close();
}

function leaveGame() {
  parkedGame=true;
  parkedSaveWritten=false;
  try {
    localStorage.setItem(savedGameKey,JSON.stringify({
      cityKey,mode,stations,lines,trains,retiring,inventory,time,nextStation,nextPassenger,week,score,paused,speed,selected,
      nextSpawnBoost,lastTouch,eligibleExtreme,upcomingStation,scheduleIndex,specialsSpawned,specialPool,stationQueue,
      stationGap,recentTrips,scenicMilestone,nextEfficiency,history,daily,replayFrames,lesson,
      bends:lines.map(route => route.bends),
    }));
    parkedSaveWritten=true;
  } catch {}
  showMenu();
}

function readSavedGame() {
  try {
    const game=JSON.parse(localStorage.getItem(savedGameKey));
    if (game && Object.hasOwn(cities,game.cityKey) && modes.includes(game.mode) &&
        Number.isFinite(game.time) && game.time>=0 && Number.isInteger(game.selected) &&
        game.selected>=0 && game.selected<7 && game.inventory && game.daily &&
        ['stations','lines','trains','retiring','specialPool','stationQueue','recentTrips','history','replayFrames']
          .every(key => Array.isArray(game[key])) &&
        game.lines.length===7 && game.lines.every(route => Array.isArray(route) &&
          route.every(id => Number.isInteger(id) && id>=0 && id<game.stations.length))) return game;
  } catch {}
  return null;
}

function resumeGame(game) {
  const consumeSave=!parkedGame || parkedSaveWritten;
  if (!parkedGame) {
    mode=game.mode;
    reset(game.cityKey);
    ({stations,lines,trains,retiring,inventory,time,nextStation,nextPassenger,week,score,paused,speed,selected,
      nextSpawnBoost,lastTouch,eligibleExtreme,upcomingStation,scheduleIndex,specialsSpawned,specialPool,stationQueue,
      stationGap,recentTrips,scenicMilestone,nextEfficiency,history,daily,replayFrames,lesson}=game);
    for (const frame of [game,...replayFrames]) {
      frame.lines.forEach((route,index) => {route.bends=frame.bends?.[index] ?? undefined;});
    }
    if (mode==='creative') enableCreative();
    if (lesson) document.documentElement.dataset.lesson=String(lesson.stage);
    rebuildTracks();
    updateCamera();
    updateLines();
    updateHUD();
  }
  parkedGame=false;
  if (consumeSave) {
    try {localStorage.removeItem(savedGameKey);} catch {}
  }
  $('screen').close();
}

function applyNight(enabled) {
  night=enabled;
  document.documentElement.classList.toggle('night',enabled);
  ({paper,water,ink,colors}=themes[cityKey][enabled ? 'night' : 'day']);
  if (colorblind) colors=colorblindColors;
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
    [colorblind ? '色觉辅助：开' : '色觉辅助：关',() => {
      colorblind=!colorblind;
      applyNight(night);
      updateLines();
      try {localStorage.setItem('metro-colorblind',String(colorblind));} catch {}
      showPauseMenu();
      $('choices').children[2].focus();
    }],
    [sound ? '声音：开' : '声音：关',() => {
      sound=!sound;
      try {localStorage.setItem('metro-sound',String(sound));} catch {}
      showPauseMenu();
      $('choices').children[3].focus();
    }],
    [lesson ? '跳过教程' : '重新开始',() => start(cityKey,mode)],
    ['城市选择',leaveGame],
    ['照片模式',() => showPhoto(showPauseMenu)],
  ],'','pause');
  $('choices').children[1].setAttribute('aria-pressed',String(night));
  $('choices').children[2].setAttribute('aria-pressed',String(colorblind));
  $('choices').children[3].setAttribute('aria-pressed',String(sound));
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
  const savedGame=parkedGame ? null : readSavedGame();
  if (parkedGame || savedGame) options.push(['↖ 继续运营',() => resumeGame(savedGame)]);
  const label=menuCity==='NewYork' ? 'New York' : menuCity;
  const description=menuMode==='creative' ? '创意模式 · 手动设计车站与客流' : menuMode==='endless' ? '无尽模式 · 提高每日客运量以获得资源' : menuMode==='extreme' && !extremeUnlocked(menuCity) ? '解锁条件：'+extremeGoals[menuCity].label : label;
  showPanel(current.name,description,options,'Mini Metro','cities');
  if (parkedGame && !parkedSaveWritten) $('description').textContent+=' · 本局仅保留在当前页面';
  [...$('choices').children].find(button => button.textContent.startsWith('↓')).dataset.modeToggle='';
  $('cityStrip').hidden = false;
  $('cityStrip').replaceChildren(...keys.map(key => {
    const city = cities[key];
    const button = document.createElement('button');
    button.className = 'city-option';
    button.setAttribute('aria-pressed',key===menuCity);
    const preview=themes[key][night ? 'night' : 'day'];
    const previewColors=colorblind ? colorblindColors : preview.colors;
    button.style.setProperty('--accent',previewColors[1]);
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
    line([[a[0]-100,a[1]+90],a,b],previewColors[0],6);
    line([a,c,[c[0]+75,c[1]+80]],previewColors[1],6);
    line([[b[0]-100,b[1]+70],b,c],previewColors[2],6);
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

// 当前应显示的提示：[{point, side, text}]，side 为 -1 向左下、1 向右上。
function currentTips() {
  if (lesson || phase!=='play' || drag || vehicleDrag || assetDrag || mode==='creative' || time-lastTouch<tipTiming.build) return [];
  const connected=new Set(lines.flat());
  if (!connected.size) {
    let pair=null, best=Infinity;
    stations.forEach((a,i) => stations.forEach((b,j) => {
      if (i===j) return;
      const wanted=a.waiting.some(rider => rider.type===b.type);
      const cost=distance(a,b)*(wanted ? 1 : 3);
      if (cost<best) {best=cost;pair=[a,b];}
    }));
    return pair ? [{point:pair[0],side:-1,text:'从这里拖动…'},{point:pair[1],side:1,text:'…连接到这里。'}] : [];
  }
  const lonely=stations.map((s,id) => ({s,id})).filter(({s,id}) => !connected.has(id) && (s.idle ?? 0)>=tipTiming.unconnected);
  if (!lonely.length) return [];
  const target=lonely.reduce((a,b) => (b.s.waiting.length>a.s.waiting.length ? b : a));
  let handle=null, near=Infinity;
  lines.forEach(route => {
    if (route.length<2 || looped(route)) return;
    for (const stub of terminatorStubs(route)) {
      const d=distance(stub,target.s);
      if (d<near) {near=d;handle=stub;}
    }
  });
  // 离线路中段更近时改提示"拖动这条线"：手柄在线路上离目标站最近的点（试玩构建）。
  let middle=null, middleNear=Infinity;
  lines.forEach(route => {
    if (route.length<2) return;
    linkPaths(route).forward.forEach(path => path.slice(1).forEach((b,i) => {
      const a=path[i], dx=b.x-a.x, dy=b.y-a.y, length=dx*dx+dy*dy;
      const t=length ? Math.max(0,Math.min(1,((target.s.x-a.x)*dx+(target.s.y-a.y)*dy)/length)) : 0;
      const point={x:a.x+t*dx,y:a.y+t*dy}, d=distance(point,target.s);
      if (d<middleNear) {middleNear=d;middle=point;}
    }));
  });
  if (middle && middleNear<near) return [{point:middle,side:-1,text:'拖动这条线…',handle:true},{point:target.s,side:1,text:'…到这个站上。'}];
  return handle ? [{point:handle,side:-1,text:'拖动手柄延长线路…'},{point:target.s,side:1,text:'…连接到这里。'}] : [];
}

function drawTip({point,side,text,handle}) {
  const length=140, height=30, reach=side*(length/2-height/2);
  ctx.save();
  ctx.translate(point.x+reach*Math.SQRT1_2,point.y-reach*Math.SQRT1_2);
  ctx.rotate(-Math.PI/4);
  ctx.fillStyle=night ? '#655a61' : '#695956';
  ctx.globalAlpha=.94;
  ctx.beginPath();ctx.roundRect(-length/2,-height/2,length,height,height/2);ctx.fill();
  ctx.globalAlpha=1;
  ctx.font='12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#fff';ctx.fillText(text,side*4,0);
  ctx.restore();
  if (handle) {
    ctx.beginPath();ctx.arc(point.x,point.y,7,0,2*Math.PI);
    ctx.fillStyle=themes[cityKey][night ? 'night' : 'day'].station;ctx.fill();ctx.lineWidth=2.4;ctx.strokeStyle=ink;ctx.stroke();
  }
}

function dashedRing(station,spin) {
  ctx.save();
  ctx.beginPath();ctx.arc(station.x,station.y,attentionRing,0,2*Math.PI);
  const length=2*Math.PI*attentionRing;
  ctx.setLineDash([length/9,length/9*.55]);
  ctx.lineDashOffset=-spin*18;
  ctx.globalAlpha=.55;ctx.strokeStyle=ink;ctx.lineWidth=2.2;ctx.stroke();
  ctx.restore();
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

// 线路两端的终端：沿末段方向延伸 terminator.length 处画横杆。
function terminatorStubs(ids,mapStations=stations) {
  const {forward}=linkPaths(ids,mapStations);
  return [[mapStations[ids[0]],forward[0][1]],[mapStations[ids.at(-1)],forward.at(-1).at(-2)]].map(([end,first]) => {
    const length = distance(end,first);
    const dx=(end.x-first.x)/length, dy=(end.y-first.y)/length;
    return {end,dx,dy,x:end.x+dx*terminator.length,y:end.y+dy*terminator.length};
  });
}

// 点在某条线路终端（横杆或延伸段）附近时返回该线路、端点车站和方向。
function terminatorAt(point,barOnly=false) {
  const limit=touchInput ? reach.terminatorTouch : reach.terminator;
  const half=terminator.width/2;
  let best=Math.max(limit,8/view.scale), result=null;
  lines.slice(0,inventory.lines).forEach((route,line) => {
    if (route.length<2 || looped(route)) return;
    const stubs=terminatorStubs(route);
    stubs.forEach(({end,dx,dy,x,y},k) => {
      const bar=[{x:x-dy*half,y:y+dx*half},{x:x+dy*half,y:y-dx*half}];
      const segments=barOnly ? [bar] : [[end,{x,y}],bar];
      for (const [a,b] of segments) {
        const length=distance(a,b), t=Math.max(0,Math.min(1,((point.x-a.x)*(b.x-a.x)+(point.y-a.y)*(b.y-a.y))/length**2));
        const d=Math.hypot(point.x-a.x-t*(b.x-a.x),point.y-a.y-t*(b.y-a.y));
        if (d<best) {best=d;result={line,id:k ? route.at(-1) : route[0]};}
      }
    });
  });
  return result;
}

function strokeTrack(trackPoints,riverClip) {
  ctx.lineWidth=routeWidth;
  ctx.lineJoin='round';
  ctx.lineCap='round';
  if (!riverClip || trackPoints.length<2) {ctx.stroke();return;}
  ctx.save();
  const land=new Path2D(riverClip);
  land.rect(-10000,-10000,20000,20000);
  ctx.clip(land,'evenodd');
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.clip(riverClip);
  ctx.setLineDash([15*unit,8*unit]);
  ctx.lineCap='butt';
  ctx.lineWidth=routeWidth/3;
  for (const side of [-1,1]) {
    const rail=new Path2D();
    const points=offsetLine(trackPoints,side*routeWidth/3);
    rail.moveTo(...points[0]);
    for (const point of points.slice(1)) rail.lineTo(...point);
    ctx.stroke(rail);
  }
  ctx.restore();
}

function drawRoute(route,index,preview=false,closed=false,riverClip=null,source=null,previewBase=[],previewPaths) {
  const ids=(source?.frame.lines ?? lines)[index], mapStations=source?.frame.stations ?? stations;
  if (route.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(route[0].x,route[0].y);
  const trackPoints=[[route[0].x,route[0].y]];
  if (preview) previewPaths ??= routePaths(route);
  for (let i=1;i<route.length;i++) {
    const track = preview ? previewPaths[i-1] : lineTrack(ids[i-1],ids[i],index,mapStations,source?.edges ?? edgeLines,source?.frame.lines ?? lines);
    if (preview && previewBase.some((station,j) => station===route[i-1] && previewBase[j+1]===route[i])) {
      ctx.moveTo(route[i].x,route[i].y);
      trackPoints.push([route[i].x,route[i].y]);
      continue;
    }
    for (const p of track.slice(1)) {
      const last=trackPoints.at(-1);
      if (p.x===last[0] && p.y===last[1]) continue;
      ctx.lineTo(p.x,p.y);
      trackPoints.push([p.x,p.y]);
    }
  }
  ctx.strokeStyle=colors[index];
  ctx.globalAlpha=preview ? .52 : 1;
  strokeTrack(trackPoints,preview ? null : riverClip);
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
    const stubs=terminatorStubs(ids,mapStations);
    const half=terminator.width/2;
    ctx.beginPath();
    for (const {end,x,y} of stubs) {ctx.moveTo(end.x,end.y);ctx.lineTo(x,y);}
    ctx.lineWidth=routeWidth;
    ctx.stroke();
    ctx.beginPath();
    for (const {dx,dy,x,y} of stubs) {ctx.moveTo(x-dy*half,y+dx*half);ctx.lineTo(x+dy*half,y-dx*half);}
    ctx.lineWidth=terminator.bar;
    ctx.lineCap='butt';
    ctx.stroke();
  }
  ctx.globalAlpha=1;
}

function trainPose(train,car=0) {
  const route=lines[train.line];
  const points=train.points ?? lineTrack(route[train.stop],route[stepIndex(route,train.stop,train.direction)],train.line);
  let traveled=train.progress-car*railcarSpacing, segment=1;
  while (segment<points.length-1 && traveled>distance(points[segment-1],points[segment])) {
    traveled-=distance(points[segment-1],points[segment]);
    segment++;
  }
  const from=points[segment-1], to=points[segment];
  const fraction=traveled/distance(from,to);
  return {x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction,
    angle:Math.atan2(to.y-from.y,to.x-from.x)};
}

// 乘客、车厢和列车出现时的缩放动画时长，原版 PEEP/RAILCAR_SCALE_IN_DURATION 均为 0.65 秒。
const scaleInDuration = .65;
const scaleIn = since => 1-Math.pow(1-Math.min(1,Math.max(.05,since/scaleInDuration)),3);

function mixColor(from,to,amount) {
  const rgb=hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
  const [a,b]=[rgb(from),rgb(to)];
  return '#'+a.map((v,i) => Math.round(v+(b[i]-v)*amount).toString(16).padStart(2,'0')).join('');
}

function drawTrain(train) {
  for (let i=0;i<=train.cars;i++) {
    const pose=trainPose(train,i);
    ctx.save();
    ctx.translate(pose.x,pose.y);
    ctx.rotate(pose.angle);
    const grow=scaleIn(i===train.cars && train.carBorn!==undefined ? time-train.carBorn : time-(train.born ?? -Infinity));
    ctx.scale(grow,grow);
    ctx.globalAlpha=train.move && (train.move.car===0 || train.move.car===i) ? .45 : 1;
    ctx.fillStyle=colors[train.line];
    ctx.fillRect(-railcar.length/2,-railcar.width/2,railcar.length,railcar.width);
    ctx.fillStyle=paper;
    const tint=mixColor(colors[train.line],'#ffffff',.6);
    train.riders.slice(i*6,i*6+6).forEach((rider,j) => shape(rider.type,(Math.floor(j/2)-1)*railcar.gap,(j%2-.5)*railcar.gap,peepRadius*railcar.peep,tint));
    if (paused && i===0) {
      const head=railcar.length/2, halfWidth=railcar.width/2;
      ctx.beginPath();
      ctx.moveTo(head,-halfWidth);
      ctx.lineTo(head+10*unit,0);
      ctx.lineTo(head,halfWidth);
      ctx.closePath();
      ctx.fillStyle=colors[train.line];ctx.fill();
    }
    ctx.restore();
  }
}

// 折线沿法线平移 d，转角用斜接并限制斜接长度。
function offsetLine(points,d) {
  return points.map(([x,y],i) => {
    const normals=[];
    for (const [a,b] of [[points[i-1],points[i]],[points[i],points[i+1]]]) {
      if (!a || !b) continue;
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      normals.push([(b[1]-a[1])/length,-(b[0]-a[0])/length]);
    }
    const nx=normals.reduce((sum,n) => sum+n[0],0)/normals.length, ny=normals.reduce((sum,n) => sum+n[1],0)/normals.length;
    const length=Math.hypot(nx,ny), miter=d*Math.min(2.5,1/length);
    return [x+nx/length*miter,y+ny/length*miter];
  });
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
    if (city.real) {
      const polygon=offsetLine(river,-city.bandHalf).concat(offsetLine(river,city.bandHalf).reverse());
      riverClip.moveTo(...polygon[0]);
      for (const point of polygon.slice(1)) riverClip.lineTo(...point);
      riverClip.closePath();
      continue;
    }
    const edge=[[-width,river[0][1]],...river,[width*2,river.at(-1)[1]]];
    const bank=(points,side) => points.map(([x,y],j) => {
      const variation=1.8*Math.sin(j*2.1)+1.5*Math.cos(j*1.2);
      const offset=y+side*(city.bandHalf ?? 16-i*5+variation);
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
    ctx.save();
    ctx.strokeStyle=colors[train.line];
    ctx.globalAlpha=.5;
    for (const {from,to,points} of train.removedTracks?.length ? train.removedTracks : [train]) {
      const key=train.line+'/'+edgeKey(from,to);
      if (ghostEdges.has(key)) continue;
      ghostEdges.add(key);
      ctx.beginPath();
      ctx.moveTo(points[0].x,points[0].y);
      for (const p of points.slice(1)) ctx.lineTo(p.x,p.y);
      strokeTrack(points.map(({x,y}) => [x,y]),riverClip);
    }
    ctx.restore();
  }
  mapLines.forEach((route,index) => drawRoute(route.map(id => mapStations[id]),index,false,looped(route),riverClip,source));
  if (!clean && drag?.point) {
    const points = drag.draft.map(id => stations[id]);
    if (drag.insert !== null) {
      if (drag.bend) {
        const track=drag.bend.track;
        drawRoute([track[0],track.at(-1)],drag.line,true,false,null,null,[],[track]);
      }
    } else if (!looped(drag.draft)) {
      const end = drag.head ? points[0] : points.at(-1);
      if (distance(drag.point,end)>1) {
        if (drag.head) points.unshift(drag.point);
        else points.push(drag.point);
      }
    }
    if (!drag.removing && (drag.insert===null || drag.draft!==drag.route)) {
      drawRoute(points,drag.line,true,false,null,null,lines[drag.line].map(id => stations[id]));
    }
  }
  if (!clean && mode==='extreme' && upcomingStation) {
    const {x,y}=upcomingStation;
    ctx.beginPath();ctx.arc(x,y,stationPreviewRadius,0,2*Math.PI);
    ctx.save();ctx.globalAlpha=.24;ctx.fillStyle=ink;ctx.fill();ctx.restore();
  }
  const highlighted=clean ? [] : drag?.draft ?? (focusedLine!==null || performance.now()<highlightUntil ? lines[selected] : []);
  const highlightColor=colors[drag?.line ?? selected];
  for (const [id,s] of mapStations.entries()) {
    if (!clean && phase==='ended' && s===collapseStation) {
      // 结算时导致失败的车站：深色径向渐变的大圆盘，边缘柔和（试玩构建的结算画面）。
      const reachOut=11*3.3, glow=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,reachOut);
      glow.addColorStop(0,night ? 'rgba(240,232,227,.55)' : 'rgba(58,50,50,.88)');
      glow.addColorStop(.7,night ? 'rgba(240,232,227,.4)' : 'rgba(58,50,50,.72)');
      glow.addColorStop(1,night ? 'rgba(240,232,227,0)' : 'rgba(58,50,50,0)');
      ctx.beginPath();ctx.arc(s.x,s.y,reachOut,0,2*Math.PI);ctx.fillStyle=glow;ctx.fill();
    } else if (!clean && s.pressure>0) {
      ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.arc(s.x,s.y,s===collapseStation ? 27 : 23,-Math.PI/2,-Math.PI/2+2*Math.PI*Math.min(1,s.pressure/overloadLimit));
      ctx.fillStyle=night ? '#f0e8e34a' : '#24282bb5';ctx.fill();
    }
    const growth = source ? 1 : Math.min(1,Math.max(.1,(time-s.born)/.65));
    const radius = 11*(s.capacity>6 ? interchangeScale : 1)*(1-Math.pow(1-growth,3));
    if (highlighted.includes(id)) {
      // 选中线路的车站：跟随站形的线路色粗框，位于深色描边外侧（原版截图）。
      shape(s.type,s.x,s.y,radius+(s.type===1 ? 8 : 5),'rgba(0,0,0,0)',highlightColor,4);
    }
    if (!clean && !source) {
      // 新站出现的提醒：一个迅速扩大到约 7 倍站半径再淡出的浅灰圆盘（试玩构建开局第 15 秒的画面）。
      const age=time-s.born;
      if (s.born>=0 && age>=0 && age<3) {
        ctx.beginPath();ctx.arc(s.x,s.y,11*7*Math.min(1,age/.65),0,2*Math.PI);
        ctx.save();ctx.globalAlpha=.07*(1-Math.max(0,(age-.65)/2.35));ctx.fillStyle=ink;ctx.fill();ctx.restore();
      }
      const idle=(s.idle ?? 0)-unconnectedWarning;
      if (idle>=4) {
        const grow=7*(1-Math.exp(-(idle-4)/5));
        ctx.beginPath();ctx.arc(s.x,s.y,11*grow,0,2*Math.PI);
        ctx.save();ctx.globalAlpha=.07;ctx.fillStyle=ink;ctx.fill();ctx.restore();
      }
      if (idle>=0 && idle<4) dashedRing(s,time);
    }
    shape(s.type,s.x,s.y,radius,palette.station,ink,theme.stationWidth);
    // 乘客每行 6 位，第二行起向右缩进 3 格，超出站容量的乘客颜色变淡（试玩构建截图）。
    s.waiting?.slice(0,peepRows*6).forEach((rider,i) => {
      const row=Math.floor(i/6), column=i%6+(row ? 3 : 0);
      ctx.save();
      ctx.globalAlpha=(i<s.capacity ? 1 : .55)*(phase==='ended' && s===collapseStation ? .6 : 1);
      shape(rider.type,s.x+peepOffset.x+column*peepGap.x,s.y-peepOffset.y+row*peepGap.y,peepRadius*(source ? 1 : scaleIn(time-(rider.queuedAt ?? -Infinity))),ink);
      ctx.restore();
    });
    if (s.waiting?.length>peepRows*6) {
      ctx.fillStyle=ink;ctx.font='10px system-ui';ctx.fillText('+'+(s.waiting.length-peepRows*6),s.x+peepOffset.x,s.y-peepOffset.y+peepRows*peepGap.y+peepRadius+4);
    }
  }
  // 拖线时指针周围始终有一圈虚线圈，悬停在车站上时吸附到该站（原版试玩构建）。
  if (!clean && drag?.point) dashedRing(drag.point,0);
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
  if (!clean && !source) currentTips().forEach(drawTip);
  if (!clean && !source) drawToast();
}

// 操作失败的提示：画面上方偏上的深灰圆角横幅，白字（试玩构建里跨河通道用完时的提示）。
function drawToast() {
  if (performance.now()>=feedbackUntil || !feedback) return;
  const w=canvas.clientWidth, h=canvas.clientHeight;
  ctx.save();
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  ctx.font='14px system-ui';
  const width=Math.min(w-24,ctx.measureText(feedback).width+28), x=(w-width)/2, y=Math.max(44,h*.17)-14;
  ctx.fillStyle=night ? '#655a61' : '#695956';
  ctx.globalAlpha=.94;
  ctx.beginPath();ctx.roundRect(x,y,width,28,5);ctx.fill();
  ctx.globalAlpha=1;
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(feedback,w/2,y+14,width-16);
  ctx.restore();
}

function resize() {
  const w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=Math.round(w*devicePixelRatio);
  canvas.height=Math.round(h*devicePixelRatio);
  updateCamera(w,h);
}

function cameraView(w,h,mapTime) {
  // 原版教程把镜头缩到 0.5 用 960 秒（SET_ZOOM_TARGET），伦敦地图按此缩小；其他城市沿用旧值。
  const {zoomEnd=1,zoomSpan=540}=cities[cityKey];
  const zoom=1.36+(zoomEnd-1.36)*Math.min(1,Math.max(0,mapTime-dayDuration)/zoomSpan);
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

function stationAt(point,dragging=false) {
  const base=reach.station+(touchInput ? reach.phone : 0)+(dragging ? reach.focus : 0);
  const radius=Math.min(42,Math.max(base,15/view.scale));
  let nearest=-1,best=radius;
  stations.forEach((station,i) => {
    const d=distance(station,point);
    if (d<best) {nearest=i;best=d;}
  });
  return nearest;
}

function nearestOnTrack(point,points) {
  let best=Infinity, progress=0, traveled=0;
  for (let j=1;j<points.length;j++) {
    const a=points[j-1], b=points[j], dx=b.x-a.x, dy=b.y-a.y;
    const length=distance(a,b);
    if (!length) continue;
    const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length**2));
    const d=Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);
    if (d<best) {best=d;progress=traveled+t*length;}
    traveled+=length;
  }
  return {distance:best,progress};
}

function segmentAt(point,route,line,maxDistance) {
  let hit={index:null,distance:maxDistance,progress:0};
  for (let i=1;i<route.length;i++) {
    const match=nearestOnTrack(point,lineTrack(route[i-1],route[i],line));
    if (match.distance<hit.distance) hit={index:i,...match};
  }
  return hit;
}

function alternateBend(gesture,point) {
  const {insert,line,origin}=gesture;
  if (insert===null || gesture.draft!==gesture.route || distance(point,origin)*view.scale<reach.moveThreshold) return null;
  const route=lines[line], from=route[insert-1], to=route[insert];
  const a=stations[from], b=stations[to];
  const diagonal=trackBetween(a,b,null,true), straight=trackBetween(a,b,null,false);
  if (samePath(diagonal,straight)) return null;
  const current=linkPaths(route).forward[insert-1];
  const chooseDiagonal=!samePath(diagonal,current);
  const track=chooseDiagonal ? diagonal : straight;
  const reachToBend=nearestOnTrack(point,track).distance*view.scale;
  if (reachToBend>32 || nearestOnTrack(point,current).distance*view.scale-reachToBend<8) return null;
  return {track,key:edgeKey(from,to),choice:from<to ? chooseDiagonal : !chooseDiagonal};
}

function changeBend(line,{key,choice}) {
  const route=lines[line], candidate=route.slice();
  candidate.bends={...route.bends,[key]:choice};
  if (usedCrossings(line,candidate)>inventory.crossings) {
    notify('过河通道已用完，无法改变这段走向。');
    return;
  }
  const trackFor=train => {
    const route=lines[train.line];
    return lineTrack(route[train.stop],route[stepIndex(route,train.stop,train.direction)],train.line);
  };
  const fractions=trains.map(train => train.progress/trackLength(trackFor(train)) || 0);
  route.bends=candidate.bends;
  trains.forEach((train,i) => {train.progress=Math.min(1,fractions[i])*trackLength(trackFor(train));});
  selected=line;
  rebuildTracks();
  recordReplay();
  updateLines();
  updateHUD();
}

function vehicleAt(point) {
  let best=Math.max(touchInput ? reach.carTouch : reach.car,8/view.scale), result=null;
  for (const train of trains) {
    for (let car=0;car<=train.cars;car++) {
      const d=distance(trainPose(train,car),point);
      if (d<best) {result={train,car};best=d;}
    }
  }
  return result;
}

function trackAt(point,needsTrain=false,limit=Math.max(reach.assetDrop,14/view.scale)) {
  let best=limit, result=null;
  for (let offset=0;offset<inventory.lines;offset++) {
    const line=(selected+offset)%inventory.lines;
    if (needsTrain && !trains.some(train => train.line===line)) continue;
    const match=segmentAt(point,lines[line],line,best);
    if (match.index!==null) {result={line,...match};best=match.distance;}
  }
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
    const track=segmentAt(move.point,lines[move.line],move.line,Math.max(reach.assetDrop,14/view.scale));
    if (track.index===null || (move.line!==train.line && trains.filter(t => t.line===move.line).length>=trainLimit())) return;
    unload(train,origin);
    Object.assign(train,{line:move.line,...departureFromDrop(move.line,track)});
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
  touchInput=event.pointerType!=='mouse';
  lastTouch=time;
  const point=pointerPoint(event);
  let station=stationAt(point);
  const grabbed=station<0 || distance(point,stations[station])>15 ? terminatorAt(point,station>=0) : null;
  if (grabbed && !(mode==='creative' && $('creativeEdit').getAttribute('aria-pressed')==='true') && $('interchange').getAttribute('aria-pressed')!=='true') {
    station=grabbed.id;
    if (grabbed.line!==selected) {selected=grabbed.line;highlightUntil=performance.now()+1500;updateLines();updateHUD();}
  }
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
  let insert=null, head=false, draft=route.slice(), line=selected, reverseStart=null;
  if (station>=0) {
    const empty=route.length ? lines.slice(0,inventory.lines).findIndex(path => !path.length) : selected;
    const end=!looped(route) && (station===route[0] || station===route.at(-1));
    if (grabbed || (empty<0 && end)) {
      head=station===route[0];
    } else {
      if (empty<0) reverseStart=station;
      else line=empty;
      draft=[station];
    }
  } else {
    if (mode==='extreme') return;
    const limit=Math.max(touchInput ? reach.routeTouch : reach.route,8/view.scale);
    const hit=event.shiftKey ? {line:selected,...segmentAt(point,route,selected,limit)} : trackAt(point,false,limit);
    if (!hit || hit.index===null) return;
    ({index:insert,line}=hit);
    draft=lines[line].slice();
  }
  drag={pointer:event.pointerId,point,origin:point,lastStation:station,line,route:draft,draft,head,insert,reverseStart,splitRing:event.shiftKey};
  canvas.setPointerCapture(event.pointerId);
};

function extendDraft(target,point) {
  const {draft,head,insert,route}=drag;
  if (insert!==null) {
    const near=distance(point,drag.origin)*view.scale<=reach.moveThreshold;
    // 删站是累积的：松手前回到按下处才撤销，移动途中不会还原
    if (drag.removing && near) Object.assign(drag,{draft:route,removing:false,ids:null});
    if (target<0) return;
    if (!route.includes(target)) {
      if (!drag.removing) drag.draft=route.slice(0,insert).concat(target,route.slice(insert));
    } else if (!drag.splitRing && !near) {
      // gap 是被按住线段两端之间的位置：每删一站，缺口就扩到下一个相邻站
      const ring=looped(route);
      const ids=drag.ids ?? route.slice(0,routeSize(route)), n=ids.length;
      const g=drag.gap ?? insert;
      const left=ids[ring ? (g-1+n)%n : g-1], right=ids[ring ? g%n : g];
      const j=ids.indexOf(target);
      if (j>=0 && (target===left || target===right) && n>(ring ? 3 : 2)) {
        const remaining=ids.filter(id => id!==target);
        drag.gap=ring ? ((j<g%n ? g%n-1 : g%n)%remaining.length) : (j<g ? g-1 : g);
        drag.ids=remaining;
        drag.draft=ring ? [...remaining,remaining[0]] : remaining;
        drag.removing=true;
      }
    }
    return;
  }
  if (target<0 || target===drag.lastStation) return;
  drag.lastStation=target;
  if (drag.reverseStart!==null) {
    if (drag.draft!==drag.route) return;
    const start=drag.reverseStart;
    const line=lines.findIndex(route => route.length && !looped(route) && !route.includes(start) &&
      (route[0]===target || route.at(-1)===target));
    if (line<0) return;
    const route=lines[line], head=route[0]===target;
    Object.assign(drag,{line,head,route,draft:head ? [start,...route] : [...route,start]});
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
    vehicleDrag.moved ||= distance(vehicleDrag.origin,pointerPoint(event))*view.scale>reach.moveThreshold;
    if (vehicleDrag.moved) showAssetGhost(vehicleDrag.car ? '#carriage' : '#locomotive',event);
    return;
  }
  if (drag?.pointer !== event.pointerId) return;
  const point=pointerPoint(event), target=stationAt(point,true);
  drag.point=target>=0 ? stations[target] : point;
  extendDraft(target,point);
  drag.bend=target<0 && !drag.splitRing ? alternateBend(drag,point) : null;
};

canvas.onpointerup = event => {
  lastTouch=time;
  if (vehicleDrag?.pointer===event.pointerId) {
    const vehicle=vehicleDrag;
    vehicleDrag=null;
    $('assetGhost').hidden=true;
    if (vehicle.moved) scheduleVehicleMove(vehicle,pointerPoint(event));
    return;
  }
  if (drag?.pointer !== event.pointerId) return;
  const point=pointerPoint(event), target=stationAt(point,true);
  extendDraft(target,point);
  const {route,draft,line,insert,origin,splitRing}=drag;
  const bend=target<0 && !splitRing ? alternateBend(drag,point) : null;
  drag=null;
  if (bend) {changeBend(line,bend);return;}
  let updated=draft;
  if (splitRing && target<0 && insert!==null && looped(route) && route===draft && distance(point,origin)*view.scale>25) {
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
      if (!active) notify('选择一个车站，将容量提高到 18');
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
function setToolbarExpanded(expanded) {
  const button=$('toolbarToggle'), toolbar=$('toolbar');
  if (!expanded && toolbar.contains(document.activeElement)) button.focus();
  button.setAttribute('aria-expanded',String(expanded));
  toolbar.inert=!expanded;
  if (!expanded) {focusedLine=null;updateHUD();}
}
$('toolbarToggle').onclick=event => {
  setToolbarExpanded(event.currentTarget.getAttribute('aria-expanded')!=='true');
};
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
  if (event.key==='ArrowUp' || event.key==='ArrowDown') {
    if (phase!=='play' || lesson?.stage===0) return;
    setToolbarExpanded(event.key==='ArrowUp');
    event.preventDefault();
    return;
  }
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
try {
  colorblind=localStorage.getItem('metro-colorblind')==='true';
  applyNight(localStorage.getItem('metro-night')==='true');
} catch {}
reset(cityKey);
resize();
showMenu();
setInterval(updateHUD,250);
requestAnimationFrame(frame);

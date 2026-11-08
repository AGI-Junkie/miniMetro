# 原版逆向记录

目标是截图所示的 Windows Steam 正式版 Mini Metro（App 287980）。目前没有取得该版本的发行文件，旧网页试玩版只作版本独立的参考。

- [官方游戏介绍](https://dinopoloclub.com/games/mini-metro/)提供截图、预告和商店入口。[Steam 商店页](https://store.steampowered.com/app/287980/Mini_Metro/)未找到试玩下载入口。
- [2020-11-12 官方旧站归档](https://web.archive.org/web/20201112004013id_/http://old.dinopoloclub.com/minimetro/)的 HTML 第 126–133 行指向 Unity WebGL 构建 gamma21。已保存 HTML 和 38,434 字节的 UnityLoader.js。
- 对归档中的 gamma21.js、gamma21.asm.js、gamma21.data 和 gamma21.mem 请求均返回 HTTP 404。备用索引查询超时或返回临时离线页，无法确认其他快照是否留有构建。
- REA 成功解析 UnityLoader.js。见 [REA 证据](official-web-demo-rea.json)。覆盖的是加载器，无法据此恢复原版动画、UI 或模拟规则。

取得目标版本后，记录 Steam Build ID 和文件哈希，识别 Unity 编译路线，再将静态发现与原版运行录像交叉核对。验证项目包括菜单和地图 UI、镜头和动画时序、线路拖拽与重叠、闭环和改线、列车运动和上下客、客流与拥堵、城市参数、升级、结算和模式差异。逐项保留证据及未验证项，完成对照后再开始实现。

## 撤线和寻路补充

- [开发者关于绕站的说明](https://steamcommunity.com/app/287980/discussions/0/617328415063616398/)确认经过未接入车站的线路会以空心表示，编辑或选择线路时只高亮已接入车站。
- [开发者讨论](https://steamcommunity.com/app/287980/discussions/0/2552901289725324391/)提到玩家使用临时撤线策略。[玩家对末班车的描述](https://www.reddit.com/r/MiniMetro/comments/1wi0kkl/this_game_is_so_stupid_and_unfair/)补充了可复查的下一站下客行为。网页据此保留行驶中的旧区间，区间退出正常寻路，列车抵达后按乘客目的站形状送达或转入车站队列。旧区间占用过河资源直到驶离。同色新线路如何复用旧车是本版近似。
- [官方乘客 AI 更新说明](https://store.steampowered.com/oldnews/?appgroupname=Mini+Metro&appids=287980&enddate=1514793600&feed=steam_community_announcements)和上面的开发者讨论确认，乘客会预测各方向列车到站与换乘窗口，可能故意等另一班车。网页现根据列车位置、方向、停站时间和加减速预测车次，按预计到达时间选车。根据公告示例使用 10% 的线性换乘余量，另设 0.12 秒下限。未来满载、调度和原版的精确预测曲线仍未核对。同一公告合集中的 2017 年 12 月更新确认暂停时显示车头方向，网页已加入。
- [官方更新日志](https://store.steampowered.com/news/posts/?appids=287980&enddate=1432509475&feed=steam_community_announcements)确认普通及极限模式结算可查看统计图。无尽模式的结束及升级行为仍需找正式版证据。


## 结算统计补充

Steam 官方商店第十张截图显示左侧 11 个指标开关，默认曲线为每日送达、累计送达和人口。[官方日志](https://store.steampowered.com/news/posts/?appids=287980&enddate=1432509475&feed=steam_community_announcements)确认从结算进入。网页版每个游戏日及结算时记录实测数据。轨道长度以地图单位计，运力统计车载席位，人口指在途与候车乘客，拥挤乘客按各站超出容量人数计算。候车、距离、换乘为当日完成行程的均值，各曲线按自己的峰值缩放。原版的统计口径、单位及归一化公式未确认，网页版按这些定义实现。

## 每周升级补充

[Steam 官方截图](https://store.steampowered.com/app/287980/Mini_Metro/)第六张显示周数、大图标、奖励名称与说明，以及底部仍清晰可见的资源栏和灰色线路空位。[官方 Beta 18 日志](https://store.steampowered.com/news/posts/?appids=287980&enddate=1432509475&feed=steam_community_announcements)确认选中的奖励会飞入底部资源栏。[官方地图指南](https://steamcommunity.com/sharedfiles/filedetails/?id=2295902845)确认常规地图一般先发机车，再选一项其他升级。网页保留单台固定机车和二选一，将奖励动画时长设为 430 毫秒，奖励到账后恢复模拟。系统启用减弱动态效果时跳过飞入动画。该截图中的新干线为特定地图奖励，当前三张地图未添加这个选项。

## 夜间主题、时钟及伦敦试玩构建

- [Steam 第三张截图](https://store.steampowered.com/app/287980/Mini_Metro/)显示暗色陆地、偏灰的水域和浅色站线与乘客。[官方 Beta 19 日志](https://store.steampowered.com/news/posts/?appids=287980&enddate=1432509475&feed=steam_community_announcements)确认暂停菜单可切换夜间主题，也列出数字键和方向键调速。网页采用近似的统一夜间配色，偏好保存在浏览器。
- [伦敦试玩页说明](https://www.coolmathgames.com/0-mini-metro-london)明确普通速度和双倍速度。网页时钟提供暂停、正常、双倍三档，数字键 1–3 按这一顺序选档，左右键逐档切换。Steam 正式版各版本的档位仍待实测。
- 伦敦试玩公开入口 /play 自报 Dinosaur Polo Club / Mini Metro / 2.51.0，加载 Unity WebGL。研究文件位于 `coolmath-london`，包括原始容器、SHA-256 成员清单和 REA 证据。REA 解析出 IL2CPP v27、30 个程序集、3,669 个类型和 27,106 个方法记录。Assembly-CSharp 包含 City、Clock、Line、Station、Train 和 Game。Clock 有 GetDayFromTime、get_DayLength、SkipToEndOfWeek 等方法。
- 这些是伦敦试玩构建的静态观察。REA 的 WASM 检查需要 WABT 1.0.42，当前未配置，未恢复方法体或核对 Steam 正式版行为。研究用构建文件未嵌入离线网页。

## 伦敦试玩构建的运行观察与配置

- Chrome 可运行 [伦敦试玩公开入口](https://www.coolmathgames.com/0-mini-metro-london/play)。`coolmath-london/runtime-probe.js` 记录从 PLAY 到开局 60 秒的画面。开局出现三个形状、浅蓝双线水岸，稍后出现指向起终站的拖线引导。观察处于教程，不能用这 60 秒推断普通模式的周长或生成节奏。
- UnityPy 1.24.2 解出 `data.unity3d` 内 TextAsset 42 Subway、45 Metro、74 Default、109 Tutorial 和 180 Tube，见同目录的 `extract-config.py`。根据[官方地图指南](https://steamcommunity.com/sharedfiles/filedetails/?id=2295902845)，将 Tube、Metro、Subway 的昼夜色值分别用于伦敦、巴黎、纽约。Tube 末条线路日间蓝色通道记录为 315，网页按 8 位 RGB 上限 255 显示。水岸和站线粗细换算、河道坐标和镜头仍是网页近似。
- Default 配置的机车参数为速度 130、加速 55、减速 110，容量 6。单位和网页地图比例尚未校准，当前运行速度未直接替换。教程 TextAsset 含显式生成、等待、提示、跳周等事件，可用于后续重建。
- WABT 1.0.42 已在研究目录通过发布方 SHA-256 校验。REA CLI 识别工具版本后拒绝 20,133,772 字节的 WASM，因为当前适配器输入上限为 8 MiB。直接运行 WABT 校验完整模块通过，模块目录见 `wabt-sections.txt`。未截断模块，也未建立 IL2CPP 方法和 WASM 地址的对应关系。

## 伦敦入门教程接入

依据 `coolmath-london/asset-109-tutorial.txt` 的初次连线、首位乘客送达、线路延长、中段加站、首次过河、第二周升级事件，以及公开试玩的画面，网页提供独立的伦敦入门入口。初始只显示两站、一位待运乘客和地图内的起终点引导，线路开通后才走时。教程期间关闭随机生成和超载结算，连接过河站后保留线路、列车和分数进入第二周升级。可通过暂停菜单跳过。位置坐标、生成时间、镜头过渡、教程第二周后续提示采用简化实现，正式版首次进入时的自动教程流程也未复刻。保留显式入口以便直接选择城市与模式。

## 极限模式与三城解锁

[Steam 成就](https://steamcommunity.com/achievements/287980)和[伦敦解锁讨论](https://steamcommunity.com/app/287980/discussions/0/458605613394573795/)用于核对伦敦 1,000 人且至多一条通道、巴黎 1,300 人且至多三条线路、纽约 1,600 人且方形站最多出现在两条线路上。开发者讨论确认伦敦的临时撤线不计入挑战、暂停及编辑时不判定。网页版对三城均在普通局运行时检查，首次实际超限后本局失去资格，解锁单独保存于浏览器。已解锁的极限局可新建或延长线路，闭环后不可拆开，且保留超载失败和周升级。新站先以浅色点预告，提前 4 秒为近似值。普通局尚未实现原版的跨线路调车，因而也没有独立的极限调车对照。原版成就卡上的挑战辅助提示与完整地图解锁链尚未覆盖。

## 无尽模式效率与奖励

[开发者关于计分的说明](https://steamcommunity.com/app/287980/discussions/0/616187203905177793/)确认按过去七个游戏日的平均每日送达数计分。[开发者发布的效率门槛](https://steamcommunity.com/app/287980/discussions/0/312265782621947779/)给出从 4 到 90 的 17 个值。网页采用该序列，达到门槛时自动授予资源并推进目标，右上角显示当前值、目标和圆形进度，不使用周升级弹窗。从普通或极限结算续玩时保留路网、资源、总送达和近期送达记录，清除超载计时。[后续更新日志](https://www.gogdb.org/product/1434554947/releasenotes)记录了更高效率可继续获得资源。网页在已知门槛之后暂以 15 递增；各城市的正式版高阶门槛、奖励顺序及拥挤时需求调节未确认，网页使用轮换奖励、候车容量限制和调整后的需求速率。

## 机车与车厢的落点

[开发者更新日志](https://steamcommunity.com/app/287980/discussions/0/35221031816936926/?ctp=2&fp=2&l=vietnamese)的 Beta 5 记录了更精确的机车放置，以及车厢挂到最近的列车。网页将机车拖放点投影到实际绘制的轨道，并沿线路方向发车。车厢拖放时选择落点最近的线路和该线路上最近的列车。单击图标仍是网页快捷操作，原版如何决定方向及跨多条相邻线路选择列车尚未实测。Beta 7 还记录了已投放机车和车厢可调拨，网页这一轮只更新了库存资源的拖放。

## 已投放车辆调拨

[开发者更新日志](https://steamcommunity.com/app/287980/discussions/0/35221031816936926/?ctp=2&fp=2&l=vietnamese)的 Beta 7 确认机车和车厢可从现有位置拖往其他线路或列车。[玩家操作记录](https://steamcommunity.com/sharedfiles/filedetails/?id=606368984&l=german)说明车辆到下一站后才下客并换位，调拨期间不能重复拖拽。网页普通和无尽局支持该操作，极限局禁止。机车按整列调拨，车厢按单节调拨。目标线路或列车已不存在时，未完成的调拨取消。未核对原版的同线发车方向、同向车距控制、拖到库存栏及调拨期间的 AI 预测细节。

## 照片模式

[官方 Miniversary 公告](https://steamcommunity.com/app/287980/announcements/)确认可导出带装饰边框的地铁网络照片。[Steam 商店截图](https://store.steampowered.com/app/287980/Mini_Metro/)显示结算右下角相机入口。网页从结算或暂停进入照片预览，冻结当前局面，去掉编辑提示和超载遮罩，保留地图、线路、站点、列车与乘客。可切换无边框和城市标题边框，按当前画布像素尺寸下载 PNG。边框为网页自行绘制，正式版的边框样式、GIF 和回放仍未复刻。

## 路网回放

[Steam 原版界面](https://store.steampowered.com/app/287980/Mini_Metro/)的结算截图将播放按钮放在统计和相机之间。[原版操作记录](https://steamcommunity.com/app/287980/discussions/0/3041606534837462640/)确认该按钮会加速重播本局。网页在新站生成、线路改动、换乘站升级和结算时记录路网状态，并在同一位置提供播放、暂停和拖动进度。回放复用地图渲染，保留并行线路、过河段和换乘站样式。播放间隔和进度条是网页实现，当前只重播路网变化，不逐帧记录车辆、乘客或原版过渡动画，也未加入 GIF 导出。

## GIF 导出

[官方 Miniversary 公告](https://steamcommunity.com/app/287980/announcements/)确认原版可以导出地铁网络 GIF。网页在结算回放中导出整局路网动画，复用路网回放画面，在离线浏览器内编码 GIF89a。长边最多 480 像素，超过 120 个事件时均匀选取并保留首尾。色表保留地图和线路的主题色。该导出记录站点、轨道与换乘站变化，原版的实时列车与客流 GIF、录制时机和编码参数仍未对齐。

## 创意模式

[官方创意模式公告](https://dinopoloclub.com/2018/11/20/1254/)确认可新增、删除和改变车站形状，调整车站繁忙程度，并提供无限机车、车厢及换乘站、起始解锁所有线路和更高的单线列车上限。网页从城市模式选项或普通与极限结算进入创意模式，可保留现有路网，使用底部编辑车站开关。删除已连车站会重接幸存车站并同步迁移列车索引。网页采用四档客流、80 站上限、单线 8 台机车及无限过河通道；原版编辑器样式、具体上限和客流参数仍未实测。

## 同向列车间距

[原版玩家操作指南](https://steamcommunity.com/sharedfiles/filedetails/?id=606368984&l=german)记录同向列车过近时会在站内等候，并建议环线列车分向运行。网页沿线路测量前车距离，按线路长度、同向车数和前车车厢数估算站内放行及同轨段尾距。对向车辆不使用此限制。到站预测也考虑当前站内等待，但未复刻原版精确阈值、后续停站队列和列车调度。

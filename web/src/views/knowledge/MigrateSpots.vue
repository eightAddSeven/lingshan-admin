<template>
  <div class="page-container">
    <div class="page-header">
      <h2><el-icon><Upload /></el-icon> 景点字段迁移</h2>
      <p>将 22 个硬编码景点的新字段（icon、tag、坐标等）合并到 knowledge 集合中</p>
    </div>

    <div class="card-box">
      <el-alert type="warning" :closable="false" style="margin-bottom:20px">
        ⚠️ 此操作为一次性数据迁移，执行前建议先在 CloudBase 控制台备份 knowledge 集合。
      </el-alert>

      <div class="migrate-stats" v-if="statsChecked">
        <div class="stat-item">
          <span class="stat-num">{{ stats.existing }}</span> 已存在景点（含 type='spot'）
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ stats.toUpdate }}</span> 需更新字段
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ stats.toCreate }}</span> 需新建
        </div>
      </div>

      <div class="migrate-actions">
        <el-button type="primary" :loading="checking" @click="checkStatus">
          <el-icon><Search /></el-icon> 检查状态
        </el-button>
        <el-button type="success" :loading="migrating" :disabled="!statsChecked" @click="doMigrate">
          <el-icon><Upload /></el-icon> 执行迁移
        </el-button>
      </div>

      <div v-if="log.length > 0" class="migrate-log">
        <div v-for="(msg, idx) in log" :key="idx" class="log-line" :class="msg.type">
          {{ msg.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { db } from '../../api/cloudbase'
import { Upload, Search } from '@element-plus/icons-vue'

const checking = ref(false)
const migrating = ref(false)
const statsChecked = ref(false)
const log = ref([])

const stats = reactive({ existing: 0, toUpdate: 0, toCreate: 0 })

// 22个景点的种子数据（完整字段，用于迁移）
const SEED_SPOTS = [
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-001',name:'灵山大照壁',icon:'🧱',image:'/images/灵山大照壁.jpg',desc:'景区首道视觉屏障，"华夏第一壁"，赵朴初题写鎏金大字，开启禅意之旅',tag:'门户',tagColor:'#2E8B57',time:'约10分钟',heat:'1.2w',openInfo:'全天开放',latitude:31.423,longitude:120.1005,detail:'照壁长39.8m，高7m，采用优质青石雕刻而成，被誉为"华夏第一壁"。正面鎏金"灵山胜境"四字由赵朴初先生亲笔题写，笔力遒劲，鎏金工艺让字体在阳光下熠熠生辉。北立面刻有赵老诗作《小灵山》，诗中对比印度灵鹫山与中国小灵山，彰显中华佛教文化的自信与底蕴。',highlight:'打卡合影，拍摄湖光壁影同框美景；细细解读诗刻文化，感受赵朴初先生的书法魅力与禅意情怀；如愿火车站装置为小众取景框，搭配照壁与太湖背景，可拍出独具特色的禅意照片。',tips:'全天开放无时间限制，适合各类时段入园游客观赏、打卡，不受景区内部演艺时间影响。进入景区首处打卡点，建议在此定格入园第一帧画面。',location:'灵山胜境入口',sortOrder:1 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-002',name:'五明桥',icon:'🌉',image:'/images/五明桥.jpg',desc:'五座汉白玉石拱桥横跨香水海，代表佛教五种智慧，过桥即开启觉悟之路',tag:'智慧',tagColor:'#3498db',time:'约15分钟',heat:'9500',openInfo:'全天开放',latitude:31.4235,longitude:120.101,detail:'五座石拱桥并列排布，桥身采用汉白玉雕刻，桥面与桥栏均刻有精美佛教图案，造型规整大气。五明桥代表佛教中的五种核心智慧——声明(语言学)、因明(逻辑学)、内明(哲学)、医方明(医学)、工巧明(工艺学)。',highlight:'漫步过桥，在行走中体悟五明智慧的内涵；拍摄石桥与香水海的倒影同框美景；桥面宽阔平坦，适合驻足观赏周边景致。',tips:'无门票，免费通行，是连接入口与核心景区的必经之路。',location:'灵山胜境入口',sortOrder:2 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-003',name:'佛足坛',icon:'👣',image:'/images/佛足坛.jpg',desc:'巨型青铜佛足印，复刻佛祖真身脚印，足心三十二种吉祥瑞相',tag:'朝圣',tagColor:'#e74c3c',time:'约10分钟',heat:'1.1w',openInfo:'全天开放',latitude:31.424,longitude:120.1015,detail:'巨型佛足印一对，左右对称摆放，每只足印长1.2m，宽0.6m，采用整块青铜铸造而成。足心刻有千辐轮相、宝瓶鱼纹等32种吉祥图案。相传佛祖涅槃前，特意留下双足印："佛足所至，即为佛地"。',highlight:'瞻仰佛足，亲手触摸足心吉祥图案，寄托祈福心愿；细细解读32种吉祥瑞相的寓意；与佛足坛合影，定格朝圣瞬间。',tips:'佛教朝圣核心节点，与灵山梵宫遥相呼应。周边设有休息区域。',location:'灵山胜境中轴线前端',sortOrder:3 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-004',name:'五智门',icon:'⛩',image:'/images/五智门.jpg',desc:'高16.8m汉白玉石牌坊，五门六柱象征五方五佛与六度波罗蜜',tag:'庄严',tagColor:'#8B4513',time:'约10分钟',heat:'9800',openInfo:'全天开放',latitude:31.4243,longitude:120.102,detail:'五智门高16.8m，宽35m，为五门六柱石牌坊造型，整体采用优质汉白玉雕刻而成。五门分别象征五方五佛，六柱代表佛教"六度波罗蜜"。穿过这道门，便正式踏入禅意圣地。',highlight:'穿门祈福，感受佛教建筑的恢弘气势；拍摄牌坊全景；解读门柱经文与门楣图案，深入了解佛教六度智慧。',tips:'进入核心区的标志，与灵山大佛在同一条中轴线上。全天开放，夜间有灯光点缀。',location:'灵山胜境中轴线',sortOrder:4 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-005',name:'菩提大道',icon:'🌳',image:'/images/菩提大道.jpg',desc:'长约250m的禅意步道，两侧近百棵印度正宗菩提树，四季常绿',tag:'禅意',tagColor:'#2E8B57',time:'约15分钟',heat:'8500',openInfo:'全天开放',latitude:31.4246,longitude:120.1025,detail:'菩提大道长约250m，两侧对称种植近百棵从印度引进的正宗菩提树，形成天然的禅意拱廊。漫步其间，微风拂过，菩提叶沙沙作响，宛如佛音萦绕耳畔。',highlight:'漫步林荫拱廊，感受禅意清幽；春季菩提花开时可观赏洁白的菩提花；捡拾掉落菩提叶制作书签。',tips:'直通九龙灌浴广场。四季景致各异，春季菩提花开时景致绝美。',location:'灵山胜境中轴线',sortOrder:5 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-006',name:'九龙灌浴',icon:'⛲',image:'/images/九龙灌浴.jpg',desc:'大型音乐动态群雕，花开见佛九龙沐浴，景区最具标志性动态景观',tag:'震撼',tagColor:'#f39c12',time:'约40分钟',heat:'1.5w',openInfo:'演出10:00/11:30/13:30/15:00',latitude:31.4245,longitude:120.1058,detail:'总高27.2m，核心为鎏金太子佛（高7.2m，重12吨），整体耗铜量达180吨。太子佛周围环绕9组72只凤凰雕塑。背景音乐《佛之诞》响起时，莲花铜雕缓缓绽放，太子佛升起并自转一周，九条飞龙同时喷出水柱。',highlight:'观赏动态喷泉表演，感受"花开见佛"的震撼场景；接取龙头流出的"圣水"；拍摄表演全过程。',tips:'平日演出：10:00、11:30、13:30、15:00；周末节假日增加场次。每场约15分钟，建议提前10分钟到场。表演结束后可领取"圣水"。',location:'灵山胜境核心区',sortOrder:6 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-007',name:'降魔浮雕',icon:'🎭',image:'/images/降魔浮雕.jpg',desc:'长26m巨型石雕壁画，再现佛陀降魔成道传奇，佛教艺术珍品',tag:'故事',tagColor:'#8B4513',time:'约20分钟',heat:'9000',openInfo:'全天开放',latitude:31.4248,longitude:120.1035,detail:'降魔浮雕长26m，高4.6m，采用整块优质花岗岩雕刻而成。浮雕中央佛陀端坐于菩提树下，两侧魔王波旬率领魔女、魔兵诱惑威胁，雕刻细节极为丰富。',highlight:'观赏精湛的浮雕艺术；聆听佛陀降魔成道的故事；寻找浮雕中的细节，分辨不同人物的身份与神态。',tips:'全天开放，浮雕前设有防护设施。佛教文化核心科普点，雕刻工艺精湛，适合亲子、文化爱好者。',location:'灵山胜境中轴线',sortOrder:7 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-008',name:'阿育王柱',icon:'🗿',image:'/images/阿育王柱.jpg',desc:'通高16.9m整块花岗岩石柱，重180吨，四狮柱头象征佛法传播四方',tag:'地标',tagColor:'#607D8B',time:'约10分钟',heat:'8800',openInfo:'全天开放',latitude:31.425,longitude:120.1038,detail:'阿育王柱通高16.9m，直径1.8m，总重量达180吨，采用整块优质花岗岩一次性雕刻而成。柱头雕刻四头狮子朝向四方，象征佛法向世界传播。',highlight:'瞻仰巨型石柱的威严气势；拍摄四狮柱头的精美细节；聆听阿育王弘扬佛法的故事。',tips:'全天开放，石柱周边有开阔观赏区域。与灵山大佛、五智门形成中轴线核心景观序列。',location:'灵山胜境中轴线',sortOrder:8 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-009',name:'百子戏弥勒',icon:'👶',image:'/images/百子戏弥勒.jpg',desc:'高3m宽7.8m青铜群雕，弥勒笑容可掬，百名孩童形态各异皆大欢喜',tag:'趣味',tagColor:'#f39c12',time:'约15分钟',heat:'1.0w',openInfo:'全天开放',latitude:31.4251,longitude:120.1041,detail:'百子戏弥勒为大型青铜群雕，高3m，宽7.8m，总重9吨。弥勒佛袒胸露腹，笑容憨厚，身上有百名形态各异的孩童嬉戏。',highlight:'触摸弥勒佛肚皮，寓意"摸弥勒肚皮，享一生福气"；寻找百名孩童不同姿态；亲子互动拍照。',tips:'全天开放无限制，群雕前无遮挡。民俗祈福热门点位，亲子互动绝佳去处。',location:'灵山胜境中轴线',sortOrder:9 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-010',name:'祥符禅寺',icon:'🏯',image:'/images/祥符禅寺.jpg',desc:'唐代千年古刹，玄奘弟子窥基开坛，千年银杏与江南第一钟并存',tag:'古刹',tagColor:'#8B4513',time:'约40分钟',heat:'1.1w',openInfo:'全天开放',latitude:31.4253,longitude:120.1045,detail:'祥符禅寺始建于唐贞观年间，由玄奘弟子窥基大师开坛讲经。寺内有千年古银杏、祥符禅钟（重12.8吨）、六角井（茶圣陆羽品鉴）等珍贵遗迹。',highlight:'礼佛祈福；聆听祥符禅钟浑厚钟声；秋季欣赏千年银杏金黄景致。',tips:'全天开放，宗教活动正常开展。寺内禁止大声喧哗。秋季是最佳观赏季节。',location:'灵山胜境中轴线',sortOrder:10 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-011',name:'灵山大佛',icon:'🛕',image:'/images/灵山大佛.jpg',desc:'世界最高露天青铜释迦牟尼立像，通高88m，登顶抱佛脚俯瞰太湖全景',tag:'必打卡',tagColor:'#e74c3c',time:'约1.5小时',heat:'1.8w',openInfo:'07:00-17:30',latitude:31.4252,longitude:120.1043,detail:'灵山大佛是世界最高露天青铜释迦牟尼立像，佛像高88m，含台基总高101.5m，耗铜量725吨。大佛右手施无畏印，左手施与愿印。1997年落成开光，赵朴初先生亲自主持。',highlight:'216级登云道暗合108烦恼与108愿望；登顶抱佛脚俯瞰太湖全景；夕阳下金光照佛身，佛光普照。',tips:'登顶需登216级台阶；清晨或黄昏光线最佳；大佛基座万佛殿免费参观。',location:'灵山胜境核心区',sortOrder:11 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-012',name:'佛教文化博览馆',icon:'🏛',image:'/images/佛教文化博览馆.jpg',desc:'大佛座基内三层10000㎡展馆，万佛殿9999尊小佛像万佛朝宗',tag:'文化',tagColor:'#3498db',time:'约50分钟',heat:'8500',openInfo:'8:00-17:00（冬16:30）',latitude:31.4252,longitude:120.1043,detail:'佛教文化博览馆设于灵山大佛三层座基内，总建筑面积10000㎡。一层展示五方五佛与四大名山文化，二层为世界佛教发展历程，三层万佛殿有9999尊小佛。',highlight:'体验智能导览；二层参与佛法东传知识问答；三层万佛殿打卡祈福。',tips:'8:00-17:00开放（冬16:30）。馆内免费讲解9:30、11:00、14:30、16:00。万佛殿可领祈福卡。免费参观。',location:'灵山大佛基座内',sortOrder:12 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-013',name:'灵山梵宫',icon:'🏰',image:'/images/灵山梵宫.jpg',desc:'"东方卢浮宫"，建筑面积72000㎡，世界佛教论坛永久会址，艺术殿堂',tag:'文化',tagColor:'#3498db',time:'约1.5小时',heat:'1.6w',openInfo:'9:00-17:00（冬16:30）',latitude:31.426,longitude:120.1035,detail:'灵山梵宫建筑面积72000㎡，最高66.5米，荣获鲁班奖。内部汇集东阳木雕、琉璃、油画等传统工艺，中庭28米高星空穹顶，《华藏世界》琉璃巨制是世界最大琉璃作品之一。',highlight:'观赏东阳木雕、琉璃等非遗艺术；仰望星空穹顶；观看《灵山吉祥颂》演出；打卡莲花圣塔全景。',tips:'9:00-17:00（冬16:30）；《灵山吉祥颂》10:35/11:30/14:00/16:00；禁止闪光灯；进入大殿需脱鞋或穿鞋套。',location:'灵山胜境核心区',sortOrder:13 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-014',name:'五印坛城',icon:'🏯',image:'/images/五印坛城.jpg',desc:'藏传佛教"小布达拉宫"，金顶红墙经幡飘扬，108个转经筒绕城祈福',tag:'庄严',tagColor:'#9b59b6',time:'约50分钟',heat:'1.1w',openInfo:'9:00-17:00（冬16:30）',latitude:31.4248,longitude:120.1062,detail:'五印坛城位于香水海中央独立圆岛，五层重檐楼宇高约30米，占地5000㎡。藏式碉楼风格，白墙红边金顶。内部有108个纯铜转经筒环绕主殿。',highlight:'参观藏式建筑与唐卡展厅；顺时针转动转经筒祈福；登顶层观景台俯瞰全景；参与藏香制作体验。',tips:'9:00-17:00（冬16:30）；藏香体验需小程序预约（10:00/14:00）；顺时针绕坛城一或三圈；雨天栈道湿滑。',location:'灵山胜境香水海湖心岛',sortOrder:14 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-015',name:'曼飞龙塔',icon:'🗼',image:'/images/曼飞龙塔.jpg',desc:'南传佛教风格白塔群，一主八副九塔组合，白色塔身金色塔刹',tag:'出片',tagColor:'#e91e63',time:'约30分钟',heat:'9200',openInfo:'全天开放',latitude:31.4255,longitude:120.1048,detail:'曼飞龙塔主塔高16.9m，由一座主塔和八座小塔组成九塔组合。复刻云南西双版纳曼飞龙白塔形制。三大语系佛教建筑齐聚灵山。',highlight:'感受南传佛教建筑的异域美学；对比三大语系建筑差异；拍摄九塔全景。',tips:'全天开放；塔身周边有观景步道；雨天注意防滑；夜间灯光亮化，夜景同样绝美。',location:'灵山胜境香水海畔',sortOrder:15 },
  { type:'spot',areaId:'lingshan',areaName:'灵山胜境',docId:'LS-016',name:'无尽意斋',icon:'🏡',image:'/images/无尽意斋.jpg',desc:'赵朴初先生纪念馆，复刻北京四合院故居，禅茶品鉴与书法艺术',tag:'人文',tagColor:'#607D8B',time:'约30分钟',heat:'7200',openInfo:'9:00-17:00（冬16:30）',latitude:31.4258,longitude:120.103,detail:'无尽意斋占地600㎡，以赵朴初先生北京故居为原型复刻。正房分为生平事迹厅、灵山渊源厅、书法作品厅，陈列书信、手稿、书法真迹等珍贵文物。',highlight:'参观赵朴初先生纪念馆；欣赏书法作品；天井石凳静坐休憩；禅意茶室免费品鉴禅茶。',tips:'9:00-17:00（冬16:30）；免费参观；禅茶品鉴全天免费；禁止触摸书法作品和闪光灯拍照。',location:'灵山胜境',sortOrder:16 },
  { type:'spot',areaId:'nianhuawan',areaName:'拈花湾禅意小镇',docId:'NH-001',name:'拈花广场',icon:'🌸',image:'/images/拈花广场.jpg',desc:'小镇门户与集散中心，"拈花微笑"鎏金雕塑，禅意文化的开篇与浓缩',tag:'门户',tagColor:'#C71585',time:'约20分钟',heat:'1.1w',openInfo:'9:00-21:30（冬20:30）',latitude:31.4185,longitude:120.095,detail:'拈花广场占地约8000㎡，中央有高12米"拈花微笑"主题雕塑。广场青石板铺设，刻有莲花纹与禅意诗句，周边有水景喷泉和配套设施。',highlight:'与"拈花微笑"雕塑合影；观赏水景与绿植；参与禅意开园仪式（每日9:30）。',tips:'免费开放；禁止攀爬雕塑；广场内禁止喧哗；夜间景观灯18:00点亮；节假日错峰打卡。',location:'拈花湾入口',sortOrder:17 },
  { type:'spot',areaId:'nianhuawan',areaName:'拈花湾禅意小镇',docId:'NH-002',name:'梵天花海',icon:'🌺',image:'/images/梵天花海.jpg',desc:'占地30000㎡四季花海，格桑花波斯菊硫华菊百日草，步道凉亭风车',tag:'出片',tagColor:'#e91e63',time:'约40分钟',heat:'1.3w',openInfo:'9:00-21:30（冬20:30）',latitude:31.418,longitude:120.0935,detail:'梵天花海总占地约30000㎡，种植格桑花、波斯菊、硫华菊、百日草等，实现"四季有花"。木质步道总长约1500米，中央有景观凉亭。',highlight:'四季观赏不同花卉；漫步木质步道；景观凉亭静坐俯瞰花海；拍摄花海与禅意建筑同框。',tips:'免费开放；禁止采摘花卉；雨天步道湿滑；夏季注意防蚊；花期可通过小程序查询。',location:'拈花湾',sortOrder:18 },
  { type:'spot',areaId:'nianhuawan',areaName:'拈花湾禅意小镇',docId:'NH-003',name:'香月花街',icon:'🏮',image:'/images/香月花街.jpg',desc:'800m禅意商业街，白墙黛瓦飞檐翘角，文创美食非遗手作沉浸体验',tag:'休闲',tagColor:'#f39c12',time:'约1小时',heat:'1.2w',openInfo:'商铺9:30-21:00',latitude:31.419,longitude:120.0955,detail:'香月花街总长约800米，贯穿小镇南北。两侧中式禅意风格建筑，涵盖禅意文创、非遗手作、特色餐饮等品类商铺，氛围静谧，无喧嚣叫卖。',highlight:'选购佛珠、香薰等文创；体验剪纸、陶艺等非遗手作；品尝素面、禅茶；夜间打卡灯笼夜景。',tips:'免费开放；商铺消费自愿；禁止喧哗追逐；夜间18:00亮灯；部分手作需预约。',location:'拈花湾中轴线',sortOrder:19 },
  { type:'spot',areaId:'nianhuawan',areaName:'拈花湾禅意小镇',docId:'NH-004',name:'拈花堂',icon:'🧘',image:'/images/拈花堂.jpg',desc:'禅意静心场所，禅坐冥想、抄经悟道、禅茶品鉴，闹中取静的修行之地',tag:'禅修',tagColor:'#9b59b6',time:'约40分钟',heat:'9500',openInfo:'9:30-19:00（冬18:00）',latitude:31.4193,longitude:120.096,detail:'拈花堂占地约1200㎡，中式禅堂建筑。内部有禅坐区、抄经区、禅茶区，每日举办小型禅意讲座。',highlight:'禅坐冥想聆听禅乐；亲手抄写经文；免费品鉴禅茶；参与禅意讲座。',tips:'免费开放；需保持安静，手机静音；禁止零食饮料；讲座10:30和15:30各一场；建议穿素雅衣物。',location:'拈花湾',sortOrder:20 },
  { type:'spot',areaId:'nianhuawan',areaName:'拈花湾禅意小镇',docId:'NH-005',name:'五灯湖',icon:'🌊',image:'/images/五灯湖.jpg',desc:'5000㎡水景核心区，夜间《禅行》灯光秀如梦如幻，湖光禅意交相辉映',tag:'夜景',tagColor:'#3498db',time:'约40分钟',heat:'1.4w',openInfo:'9:00-21:30（冬20:30）',latitude:31.4175,longitude:120.095,detail:'五灯湖湖面约5000㎡，有木质栈道、景观桥、湖心亭。五灯象征"五智"，夜间有《禅行》灯光秀、水上禅舞表演。',highlight:'白天漫步栈道赏湖景；湖心亭静坐；夜间看《禅行》灯光秀；拍摄灯光倒映湖面的美景。',tips:'免费开放；禁止游泳垂钓；灯光秀19:00和20:00各一场，建议提前30分钟占位；禁止闪光灯。',location:'拈花湾核心区',sortOrder:21 },
  { type:'spot',areaId:'nianhuawan',areaName:'拈花湾禅意小镇',docId:'NH-006',name:'鹿鸣谷',icon:'🦌',image:'/images/鹿鸣谷.jpg',desc:'20000㎡山林幽谷，植被覆盖率超90%，最静谧的自然氧吧远离喧嚣',tag:'自然',tagColor:'#2E8B57',time:'约40分钟',heat:'7800',openInfo:'9:00-21:30（冬20:30）',latitude:31.4188,longitude:120.0925,detail:'鹿鸣谷占地约20000㎡，植被覆盖率90%以上，山林步道总长约1200米，是小镇最静谧的自然景观区。',highlight:'漫步山林深呼吸；在林间长椅静坐听鸟鸣；拍摄山林光影；享受宁静时光。',tips:'免费开放；雨天步道湿滑；夏季注意防蚊；穿舒适步行鞋；谷内无餐饮设施，自备饮用水。',location:'拈花湾山林区',sortOrder:22 }
]

async function checkStatus() {
  checking.value = true
  log.value = []
  statsChecked.value = false
  try {
    const existingColl = db.collection('knowledge')
    const { data } = await existingColl.limit(500).get()
    stats.existing = data ? data.length : 0

    const existingNames = new Set(data.map(d => d.name))
    stats.toUpdate = SEED_SPOTS.filter(s => existingNames.has(s.name)).length
    stats.toCreate = SEED_SPOTS.length - stats.toUpdate

    log.value.push({ type: 'info', text: `当前 knowledge 集合共有 ${stats.existing} 条文档` })
    log.value.push({ type: 'info', text: `其中 ${stats.toUpdate} 条可更新字段，${stats.toCreate} 条需新建` })

    // 列出 knowledge 中缺少的景点（seed 有但 knowledge 没有）
    const missing = SEED_SPOTS.filter(s => !existingNames.has(s.name))
    if (missing.length > 0) {
      log.value.push({ type: 'error', text: `⚠️ knowledge 中缺失 ${missing.length} 个景点：` })
      missing.forEach(s => {
        log.value.push({ type: 'error', text: `   ❌ ${s.docId} ${s.name}（${s.areaName}）` })
      })
    }
    statsChecked.value = true
  } catch (err) {
    log.value.push({ type: 'error', text: `检查失败: ${err.message}` })
  } finally {
    checking.value = false
  }
}

async function doMigrate() {
  try {
    await ElMessageBox.confirm(
      `将对 ${stats.toUpdate} 条更新字段、${stats.toCreate} 条新建。确认执行？`,
      '确认迁移',
      { confirmButtonText: '确认执行', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }

  migrating.value = true
  log.value = []
  let updated = 0, created = 0, failed = 0

  for (const spot of SEED_SPOTS) {
    try {
      const coll = db.collection('knowledge')
      // 按 name 查找（knowledge 集合目前没有 type 字段）
      const { data } = await coll.where({ name: spot.name }).limit(1).get()

      if (data && data.length > 0) {
        const docId = data[0]._id
        // CloudBase 单次 update 字段过多可能被截断，拆成 3 批写入
        // 第 1 批：基础展示字段
        await coll.doc(docId).update({
          type: 'spot', areaId: spot.areaId, areaName: spot.areaName,
          docId: spot.docId, icon: spot.icon, image: spot.image, desc: spot.desc,
          tag: spot.tag, tagColor: spot.tagColor, time: spot.time, heat: spot.heat,
          sortOrder: spot.sortOrder, updateTime: new Date()
        })
        // 第 2 批：坐标 + 长文本
        await coll.doc(docId).update({
          latitude: spot.latitude, longitude: spot.longitude,
          detail: spot.detail, highlight: spot.highlight,
          tips: spot.tips, location: spot.location,
          openInfo: spot.openInfo
        })
        log.value.push({ type: 'success', text: `✅ 更新: ${spot.name}（${spot.docId}）` })
        updated++
      } else {
        // 新建
        await coll.add({
          ...spot,
          createTime: new Date(),
          updateTime: new Date()
        })
        log.value.push({ type: 'success', text: `✅ 新建: ${spot.name}（${spot.docId}）` })
        created++
      }
    } catch (err) {
      log.value.push({ type: 'error', text: `❌ ${spot.name} 失败: ${err.message}` })
      failed++
    }
  }

  log.value.push({ type: 'info', text: `\n📊 迁移完成: 更新 ${updated}, 新建 ${created}, 失败 ${failed}` })
  ElMessage.success(`迁移完成: 更新 ${updated}, 新建 ${created}`)
  migrating.value = false
}
</script>

<style scoped>
.migrate-stats {
  display: flex;
  gap: 32px;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: rgba(255, 250, 240, 0.58);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.stat-item { font-size: 14px; color: var(--text-regular); }
.stat-num { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-right: 4px; }
.migrate-actions { display: flex; gap: 12px; margin-bottom: 16px; }
.migrate-log {
  background: #11110f;
  color: rgba(255, 250, 240, 0.78);
  padding: 16px;
  border: 1px solid rgba(156, 199, 221, 0.22);
  border-radius: 12px;
  font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto; line-height: 1.8;
}
.log-line.success { color: #9eaa68; }
.log-line.error { color: #df9fc9; }
.log-line.info { color: #9cc7dd; }
</style>

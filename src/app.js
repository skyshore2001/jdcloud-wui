function JdcloudApp()
{
var self = this;
self.ctx = self.ctx || {};

window.E_AUTHFAIL=-1;
window.E_NOAUTH=2;
window.E_ABORT=-100;

/**
@fn evalAttr(jo, name, ctx?)

返回一个属性做eval后的js值。

示例：读取一个对象值：

	var opt = evalAttr(jo, "data-opt");

	<div data-opt="{id:1, name:\"data1\"}"><div>

考虑兼容性，也支持忽略括号的写法，

	<div data-opt="id:1, name:\"data1\""><div>

读取一个数组：

	var arr = evalAttr(jo, "data-arr");

	<div data-arr="['aa', 'bb']"><div>

读取一个函数名（或变量）:

	var fn = evalAttr(jo, "mui-initfn");

	<div mui-initfn="initMyPage"><div>

@see evalOptions
*/
self.evalAttr = evalAttr;
function evalAttr(jo, name, ctx)
{
	var val = jo.attr(name);
	if (val) {
		val = self.evalOptions(val, ctx, function (ex) {
			self.app_alert("属性`" + name + "'格式错误: <br>" + val + "<br>" + ex, "e");
		});
	}
	return val;
}

/*
如果css项没有以指定selector开头(示例：移动端页面"#page1", 管理端页面".pageX1", 管理端对话框"#dlgX1")，则自动添加selector限定：

	.aa { color: red} .bb p {color: blue}
	.aa, .bb { background-color: black }

=> 

	#page1 .aa { color: red} #page1 .bb p {color: blue}
	#page1 .aa, #page1 .bb { background-color: black }

注意：

- 逗号的情况；
- 有注释的情况
- 支持括号嵌套，如

		@keyframes modalshow {
			from { transform: translate(10%, 0); }
			to { transform: translate(0,0); }
		}
		
- 不处理"@"开头的选择器，如"media", "@keyframes"等。
- 特定情况下，可以指定自身，如：

		#page1 {
		}
		#page1 > .list {
		}

*/
self.ctx.fixPageCss = fixPageCss;
function fixPageCss(css, selector)
{
	var level = 1;
	var css1 = css.replace(/\/\*(.|\s)*?\*\//g, '')
	.replace(/([^{}]*)([{}])/g, function (ms, text, brace) {
		if (brace == '}') {
			-- level;
			return ms;
		}
		if (brace == '{' && level++ != 1)
			return ms;

		// level=1
		return ms.replace(/((?:^|,)\s*)([^,{}]+)/g, function (ms, ms1, sel) { 
			if (sel[0] == '@')
				return ms;
			if (sel.startsWith(selector)) {
				var ch = sel.substr(selector.length, 1);
				if (ch == '' || ch == ' ' || ch == '.' || ch == '#' || ch == ':' || ch == '>' || ch == '+')
					return ms;
			}
			return ms1 + selector + ' ' + sel;
		});
	});
	return css1;
}

/**
@fn app_abort()

中止之后的调用, 直接返回.
*/
self.app_abort = app_abort;
function app_abort()
{
	throw new DirectReturn();
}

/**
@class DirectReturn

直接返回. 用法:

	throw new DirectReturn();

可直接调用app_abort();
*/
window.DirectReturn = DirectReturn;
function DirectReturn() {}

/**
@fn windowOnError()

框架自动在脚本出错时弹框报错，并上报服务端(syslog).
可通过WUI.options.skipErrorRegex忽略指定错误。
 */
function windowOnError(ev)
{
	// 出错后尝试恢复callSvr变量
	if ($.active || self.isBusy) {
		setTimeout(function () {
			$.active = 0;
			self.isBusy = 0;
			self.hideLoading();
		}, 1000);
	}
	var msg = ev.message, errObj = ev.error;
	if (errObj instanceof DirectReturn || /abort$/.test(msg))
		return true;
	if (self.options.skipErrorRegex && self.options.skipErrorRegex.test(msg))
		return true;
	if (errObj === undefined && msg === "[object Object]") // fix for IOS9
		return true;
	debugger;
	var content = msg + " (" + ev.filename + ":" + ev.lineno + ":" + ev.colno + ")";
	if (errObj && errObj.stack)
		content += "\n" + errObj.stack.toString();
	if (self.syslog)
		self.syslog("fw", "ERR", content);
	app_alert(msg, "e");
}
window.addEventListener('error', windowOnError);

// ------ enhanceWithin {{{
/**
@var m_enhanceFn
*/
self.m_enhanceFn = {}; // selector => enhanceFn

/**
@fn enhanceWithin(jparent)
*/
self.enhanceWithin = enhanceWithin;
function enhanceWithin(jp)
{
	$.each(self.m_enhanceFn, function (sel, fn) {
		var jo = jp.find(sel);
		if (jp.is(sel))
			jo = jo.add(jp);
		if (jo.size() == 0)
			return;
		jo.each(function (i, e) {
			var je = $(e);
			// 支持一个DOM对象绑定多个组件，分别初始化
			var enhanced = je.data("mui-enhanced");
			if (enhanced) {
				if (enhanced.indexOf(sel) >= 0)
					return;
				enhanced.push(sel);
			}
			else {
				enhanced = [sel];
			}
			je.data("mui-enhanced", enhanced);
			fn(je);
		});
	});
}

/**
@fn getOptions(jo, defVal?, ctx?)

第一次调用，根据jo上设置的data-options属性及指定的defVal初始化，或为`{}`。
存到jo.prop("muiOptions")上。之后调用，直接返回该属性。

通过指定ctx, 可以为属性计算时添加可访问接口, 示例: (eol1Sn属性是需要取下面input中的值)

	<button type="button" class="btnPlcNotify" data-options="newItemFlag:1, eol1Sn:ctx.eolSn">Move In from eol-1</button>
	<input id="eolSn" value="sn1"> 

取值:

	var data = WUI.getOptions($(this), null, {
		eol1Sn: jpage.find("eolSn").val()
	}

当然ctx也可以做成个funciton比如:

	<button type="button" class="btnPlcNotify" data-options="newItemFlag:1, eol1Sn:ctx('#eolSn').val()">Move In from eol-1</button>
	<input id="eolSn" value="sn1"> 

	var data = WUI.getOptions($(this), null, function (ref) {
		return jpage.find(ref);
	});

@see evalAttr
*/
self.getOptions = getOptions;
function getOptions(jo, defVal, ctx)
{
	var opt = jo.prop("muiOptions");
	if (opt === undefined) {
		opt = $.extend({}, defVal, self.evalAttr(jo, "data-options", ctx));
		jo.prop("muiOptions", opt);
	}
	else if ($.isPlainObject(defVal)) {
		$.each(defVal, function (k, v) {
			if (opt[k] === undefined)
				opt[k] = v;
		});
	}
	return opt;
}

self.setOptions = setOptions;
function setOptions(jo, val)
{
	if ($.isPlainObject(val))
		jo.prop("muiOptions", val);
}

//}}}

// 参考 getQueryCond中对v各种值的定义
function getexp(k, v, hint)
{
	if (typeof(v) == "number")
		return k + "=" + v;
	var op = "=";
	var is_like = (v.indexOf("*") >= 0);
	var is_set_op = false;
	var is_not = false;
	var ms;
	if (ms=v.match(/^(<>|>=?|<=?|!=?|=)/)) {
		op = ms[1];
		v = v.substr(op.length);
		if (op == "!") {
			is_not = true;
		}
		else {
			is_set_op = true;
		}
		if (op == "!" || op == "!=")
			op = "<>";
	}
	if (is_like && !is_set_op) {
		v = v.replace(/[*]/g, "%");
		op = (!is_not? " LIKE ": " NOT LIKE ");
	}
	v = $.trim(v);

	if (v === "null")
	{
		if (is_not)
			return k + " is not null";
		return k + " is null";
	}
	if (v === "empty")
		v = "";

	var isId = (k=="id" || k.substr(-2)=="Id");
	if (isId && v.match(/^\d+$/))
		return k + op + v;
	var doFuzzy = self.options.fuzzyMatch && !is_like && !is_set_op && !(hint == "e"); // except enum
	if (doFuzzy) {
		op = (!is_not? " LIKE ": " NOT LIKE ");
		v = "%" + v + "%";
	}
// 		// ???? 只对access数据库: 支持 yyyy-mm-dd, mm-dd, hh:nn, hh:nn:ss
// 		if (!is_like && v.match(/^((19|20)\d{2}[\/.-])?\d{1,2}[\/.-]\d{1,2}$/) || v.match(/^\d{1,2}:\d{1,2}(:\d{1,2})?$/))
// 			return op + "#" + v + "#";
	return k + op + Q(v);
}

/**
@fn getQueryCond(kvList)
@var queryHint 查询用法提示

@param kvList {key=>value}, 键值对，值中支持操作符及通配符。也支持格式 [ [key, value] ], 这时允许key有重复。

根据kvList生成BPQ协议定义的{obj}.query的cond参数。

例如:

	var kvList = {phone: "13712345678", id: ">100", addr: "上海*", picId: "null"};
	WUI.getQueryCond(kvList);

有多项时，每项之间以"AND"相连，以上定义将返回如下内容：

	"phone='13712345678' AND id>100 AND addr LIKE '上海*' AND picId IS NULL"

示例二：

	var kvList = [ ["phone", "13712345678"], ["id", ">100"], ["addr", "上海*"], ["picId", "null"] ];
	WUI.getQueryCond(kvList); // 结果同上。


设置值时，支持以下格式：

- {key: "value"} - 表示"key=value"
- {key: ">value"} - 表示"key>value", 类似地，可以用 >=, <, <=, <>(或! / != 都是不等于) 这些操作符。
- {key: "value*"} - 值中带通配符，表示"key like 'value%'" (以value开头), 类似地，可以用 "*value", "*value*", "*val*ue"等。
- {key: "null" } - 表示 "key is null"。要表示"key is not null"，可以用 "<>null".
- {key: "empty" } - 表示 "key=''".

支持and/or查询，但不支持在其中使用括号:

- {key: ">value and <=value"}  - 表示"key>'value' and key<='value'"
- {key: "null or 0 or 1"}  - 表示"key is null or key=0 or key=1"
- {key: "null,0,1,9-100"} - 表示"key is null or key=0 or key=1 or (key>=9 and key<=100)"，即逗号表示or，a-b的形式只支持数值。
- {key: "2017-9-1~2017-10-1"} 条件等价于 ">=2017-9-1 and <2017-10-1"
  可指定时间，如条件"2017-9-1 10:00~2017-10-1"等价于">=2017-9-1 10:00 and <2017-10-1"
- 符号","及"~"前后允许有空格，如"已付款, 已完成", "2017-1-1 ~ 2018-1-1"
- 可以使用中文逗号
- 日期区间也可以用"2017/10/01"或"2017.10.01"这些格式，仅用于字段是文本类型，这时输入格式必须与保存的日期格式一致，并且"2017/10/1"应输入"2017/10/01"才能正确比较字符串大小。

以下表示的范围相同：

	{k1:'1-5,7-10', k2:'1-10 and <>6'}

符号优先级依次为："-"(类似and) ","(类似or) and or

在详情页对话框中，切换到查找模式，在任一输入框中均可支持以上格式。

(v5.5) value支持用数组表示范围（前闭后开区间），特别方便为起始、结束时间生成条件：

	var cond = getQueryCond({tm: ["2019-1-1", "2020-1-1"]}); // 生成 "tm>='2019-1-1' AND tm<'2020-1-1'"
	var cond = getQueryCond({tm: [null, "2020-1-1"]}); // 生成 "tm<'2020-1-1'"。数组中任一值为null或''都一样会被忽略。
	var cond = getQueryCond({tm: [null, null]}); // 返回空串''

@see getQueryParam
@see getQueryParamFromTable 获取datagrid的当前查询参数
@see doFind

(v5.5) 支持在key中包含查询提示。如"code/s"表示不要自动猜测数值区间或日期区间。
比如输入'126231-191024'时不会当作查询126231到191024的区间。

(v6) 日期、时间字段查询时，可使用`WUI.getTmRange`函数支持的时间区间如"今天"，"本周"，"本月", "今年", "近3天(小时|周|月|季度|年)”，"前3天(小时|周|月|季度|年)”等。

@see wui-find-hint
*/
self.queryHint = "查询示例\n" +
	"文本：\"王小明\", \"王*\"(匹配开头), \"*上海*\"(匹配部分), \"!*01\"(不匹配), 不要模糊匹配用=或!=开头\n" +
	"数字：\"5\", \">5\", \"5-10\", \"5-10,12,18\"\n" +
	"时间：\">=2017-10-1\", \"<2017-10-1 18:00\", \"2017-10\"(10月), \"2017-7-1~2017-10-1\"(7-9月即3季度)\n" +
	'支持"今天"，"本周"，"本月", "今年", "近3天(小时|周|月|季度|年)”，"前3天(小时|周|月|季度|年)"等。\n' + 
	"高级：\"!5\"(排除5),\"1-10 and !5\", \"王*,张*\"(王某或张某), \"empty\"(为空), \"0,null\"(0或未设置)\n";

self.getQueryCond = getQueryCond;
function getQueryCond(kvList)
{
	var condArr = [];
	if ($.isPlainObject(kvList)) {
		$.each(kvList, handleOne);
	}
	else if ($.isArray(kvList)) {
		$.each(kvList, function (i, e) {
			handleOne(e[0], e[1]);
		});
	}

	function handleOne(k,v) {
		if (v == null || v === "" || v.length==0)
			return;

		var hint = null;
		var k1 = k.split('/');
		if (k1.length > 1) {
			k = k1[0];
			hint = k1[1];
		}

		if ($.isArray(v)) {
			if (v[0])
				condArr.push(k + ">='" + v[0] + "'");
			if (v[1])
				condArr.push(k + "<'" + v[1] + "'");
			return;
		}
		var arr = v.toString().split(/\s+(and|or)\s+/i);
		var str = '';
		var bracket = false;
		// NOTE: 根据字段名判断时间类型
		var isTm = hint == "tm" || /(Tm|^tm|时间)\d*$/.test(k);
		var isDt = hint == "dt" || /(Dt|^dt|日期)\d*$/.test(k);
		$.each(arr, function (i, v1) {
			if ( (i % 2) == 1) {
				str += ' ' + v1.toUpperCase() + ' ';
				bracket = true;
				return;
			}
			v1 = v1.replace(/，/g, ',');
			v1 = v1.replace(/＊/g, '*');
			// a-b,c-d,e
			// dt1~dt2
			var str1 = '';
			var bracket2 = false;
			$.each(v1.split(/\s*,\s*/), function (j, v2) {
				if (str1.length > 0) {
					str1 += " OR ";
					bracket2 = true;
				}
				var mt; // match
				var isHandled = false; 
				if (hint != "s" && (isTm || isDt)) {
					// "2018-5" => ">=2018-5-1 and <2018-6-1"
					// "2018-5-1" => ">=2018-5-1 and <2018-5-2" (仅限Tm类型; Dt类型不处理)
					if (mt=v2.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/)) {
						var y = parseInt(mt[1]), m = parseInt(mt[2]), d=mt[3]!=null? parseInt(mt[3]): null;
						if ( (y>1900 && y<2100) && (m>=1 && m<=12) && (d==null || (d>=1 && d<=31 && isTm)) ) {
							isHandled = true;
							var dt1, dt2;
							if (d) {
								var dt = new Date(y,m-1,d);
								dt1 = dt.format("D");
								dt2 = dt.addDay(1).format("D");
							}
							else {
								var dt = new Date(y,m-1,1);
								dt1 = dt.format("D");
								dt2 = dt.addMonth(1).format("D");
							}
							str1 += "(" + k + ">='" + dt1 + "' AND " + k + "<'" + dt2 + "')";
						}
					}
					else if (mt = self.getTmRange(v2)) {
						str1 += "(" + k + ">='" + mt[0] + "' AND " + k + "<'" + mt[1] + "')";
						isHandled = true;
					}
				}
				if (!isHandled && hint != "s") {
					// "2018-5-1~2018-10-1"
					// "2018-5-1 8:00 ~ 2018-10-1 18:00"
					if (mt=v2.match(/^(\d{4}-\d{1,2}.*?)\s*~\s*(\d{4}-\d{1,2}.*?)$/)) {
						var dt1 = mt[1], dt2 = mt[2];
						str1 += "(" + k + ">='" + dt1 + "' AND " + k + "<'" + dt2 + "')";
						isHandled = true;
					}
					// "1-99"
					else if (mt=v2.match(/^(\d+)-(\d+)$/)) {
						var a = parseInt(mt[1]), b = parseInt(mt[2]);
						if (a < b) {
							str1 += "(" + k + ">=" + mt[1] + " AND " + k + "<=" + mt[2] + ")";
							isHandled = true;
						}
					}
				}
				if (!isHandled) {
					str1 += getexp(k, v2, hint);
				}
			});
			if (bracket2)
				str += "(" + str1 + ")";
			else
				str += str1;
		});
		if (bracket)
			str = '(' + str + ')';
		condArr.push(str);
		//val[e.name] = escape(v);
		//val[e.name] = v;
	}
	return condArr.join(' AND ');
}

/**
@fn getQueryParam(kvList)

根据键值对生成BQP协议中{obj}.query接口需要的cond参数.
即 `{cond: WUI.getQueryCond(kvList) }`

示例：

	WUI.getQueryParam({phone: '13712345678', id: '>100'})
	返回
	{cond: "phone='13712345678' AND id>100"}

@see getQueryCond
@see getQueryParamFromTable 获取datagrid的当前查询参数
*/
self.getQueryParam = getQueryParam;
function getQueryParam(kvList)
{
	var ret = {};
	var cond = getQueryCond(kvList);
	if (cond)
		ret.cond = cond;
	return ret;
}

/**
@fn doSpecial(jo, filter, fn, cnt=5, interval=2s)

连续5次点击某处，每次点击间隔不超过2s, 执行隐藏动作。

例：
	// 连续5次点击当前tab标题，重新加载页面. ev为最后一次点击事件.
	var self = WUI;
	self.doSpecial(self.tabMain.find(".tabs-header"), ".tabs-selected", function (ev) {
		self.reloadPage();
		self.reloadDialog(true);

		// 弹出菜单
		//jmenu.menu('show', {left: ev.pageX, top: ev.pageY});
		return false;
	});

连续3次点击对话框中的字段标题，触发查询：

	WUI.doSpecial(jdlg, ".wui-form-table td", fn, 3);

*/
self.doSpecial = doSpecial;
function doSpecial(jo, filter, fn, cnt, interval)
{
	var MAX_CNT = cnt || 5;
	var INTERVAL = interval || 2; // 2s
	jo.on("click.special", filter, function (ev) {
		var tm = new Date();
		var obj = this;
		// init, or reset if interval 
		if (fn.cnt == null || fn.lastTm == null || tm - fn.lastTm > INTERVAL*1000 || fn.lastObj != obj)
		{
			fn.cnt = 0;
			fn.lastTm = tm;
			fn.lastObj = obj;
		}
		if (++ fn.cnt < MAX_CNT)
			return;
		fn.cnt = 0;
		fn.lastTm = tm;

		fn.call(this, ev);
	});
}

/**
@fn execCopy(text)

复制到剪贴板。
*/
self.execCopy = execCopy;
function execCopy(text)
{
	$(window).one("copy", function (ev) {
		ev.originalEvent.clipboardData.setData('text/plain', text);
		app_show("已复制到剪贴板，按Ctrl-V粘贴。");
		return false;
	});
	document.execCommand("copy");
}

}
// vi: foldmethod=marker

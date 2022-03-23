// jdcloud-wui-slim version 1.1
// ====== WEBCC_BEGIN_FILE common.js {{{
jdModule("jdcloud.common", JdcloudCommon);
function JdcloudCommon()
{
var self = this;

/**
@fn assert(cond, dscr?)
 */
self.assert = assert;
function assert(cond, dscr)
{
	if (!cond) {
		var msg = "!!! assert fail!";
		if (dscr)
			msg += " - " + dscr;
		// 用throw new Error会有调用栈; 直接用throw "some msg"无法获取调用栈.
		throw new Error(msg);
	}
}

/**
@fn randInt(from, to)

生成指定区间的随机整数。示例：

	var i = randInt(1, 10); // 1-10之间的整数，包含1或10

*/
self.randInt = randInt;
function randInt(from, to)
{
	return Math.floor(Math.random() * (to - from + 1)) + from;
}

/**
@fn randInt(from, to)

生成随机字符串，包含字母或数字，不包含易混淆的0或O。示例：

	var dynCode = randChr(4); // e.g. "9BZ3"

*/
self.randChr = randChr;
function randChr(cnt)
{
	var charCodeArr = [];
	var code_O = 'O'.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
	
	for (var i=0; i<cnt; ) {
		var ch = randInt(0, 35); // 0-9 A-Z 共36个
		// 去除0,O易混淆的
		if (ch == 0 || ch == code_O) {
			continue;
		}
		if (ch < 10) {
			charCodeArr.push(0x30 + ch);
		}
		else {
			charCodeArr.push(0x41 + ch -10);
		}
		i ++;
	}
//	console.log(charCodeArr);
	return String.fromCharCode.apply(this, charCodeArr);
}

/**
@fn parseQuery(str)

解析url编码格式的查询字符串，返回对应的对象。

	if (location.search) {
		var queryStr = location.search.substr(1); // "?id=100&name=abc&val=3.14"去掉"?"号
		var args = parseQuery(queryStr); // {id: 100, name: "abc", val: 3.14}
	}

注意：

如果值为整数或小数，则会转成相应类型。如上例中 id为100,不是字符串"100".
 */
self.parseQuery = parseQuery;
function parseQuery(s)
{
	var ret = {};
	if (s != "")
	{
		var a = s.split('&')
		for (i=0; i<a.length; ++i) {
			var a1 = a[i].split("=");
			var val = a1[1];
			if (val === undefined)
				val = 1;
			else if (/^-?[0-9]+$/.test(val)) {
				val = parseInt(val);
			}
			else if (/^-?[0-9.]+$/.test(val)) {
				val = parseFloat(val);
			}
			else {
				val = decodeURIComponent(val);
			}
			ret[a1[0]] = val;
		}
	}
	return ret;
}

/**
@fn tobool(v)

将字符串转成boolean值。除"0", "1"外，还可以支持字符串 "on"/"off", "true"/"false"等。
*/
self.tobool = tobool;
function tobool(v)
{
	if (typeof v === "string")
		return v !== "" && v !== "0" && v.toLowerCase() !== "false" && v.toLowerCase() !== "off";
	return !!v;
}

/**
@fn reloadSite()

重新加载当前页面，但不要#hash部分。
*/
self.reloadSite = reloadSite;
function reloadSite()
{
	var href = location.href.replace(/#.+/, '#');
	//location.href = href; // dont use this. it triggers hashchange.
	history.replaceState(null, null, href);
	location.reload();
	throw "abort"; // dont call self.app_abort() because it does not exist after reload.
}

// ====== Date {{{
// ***************** DATE MANIPULATION: format, addMonth, addDay, addHours ******************

function setWidth_2(number)
{
	return number < 10? ("0" + number) : ("" + number);
}

/**
@fn Date.format(fmt?=L)

日期对象格式化字符串。

@param fmt 格式字符串。由以下组成：

	yyyy - 四位年，如2008, 1999
	yy - 两位年，如 08, 99
	mm - 两位月，如 02, 12
	dd - 两位日，如 01, 30
	HH - 两位小时，如 00, 23
	MM - 两位分钟，如 00, 59
	SS - 两位秒，如 00, 59

	支持这几种常用格式：
	L - 标准日期时间，相当于 "yyyy-mm-dd HH:MM:SS"
	D - 标准日期，相当于 "yyyy-mm-dd"
	T - 标准时间，相当于 "HH:MM:SS"

示例：

	var dt = new Date();
	var dtStr1 = dt.format("D"); // "2009-10-20"
	var dtStr2 = dt.format("yyyymmdd-HHMM"); // "20091020-2038"

 */
Date.prototype.format = function(fmt)
{
	if (fmt == null)
		fmt = "L";

	switch (fmt) {
	case "L":
		fmt = "yyyy-mm-dd HH:MM:SS";
		break;
	case "D":
		fmt = "yyyy-mm-dd";
		break;
	case "T":
		fmt = "HH:MM:SS";
		break;
	}
	var year = this.getFullYear();
	return fmt.replace("yyyy", year)
	          .replace("yy", ("" + year).substring(2))
	          .replace("mm", setWidth_2(this.getMonth()+1))
	          .replace("dd", setWidth_2(this.getDate()))
	          .replace("HH", setWidth_2(this.getHours()))
	          .replace("MM", setWidth_2(this.getMinutes()))
	          .replace("SS", setWidth_2(this.getSeconds()))
			  ;
}

/** @fn Date.addDay(n) */
Date.prototype.addDay = function(iDay)
{
	this.setDate(this.getDate() + iDay);
	return this;
}

/** @fn Date.addHours(n) */
Date.prototype.addHours = function (iHours)
{
	this.setHours(this.getHours() + iHours);
	return this;
}

/** @fn Date.addMin(n) */
Date.prototype.addMin = function (iMin)
{
	this.setMinutes(this.getMinutes() + iMin);
	return this;
}

/** @fn Date.addMonth(n) */
Date.prototype.addMonth = function (iMonth)
{
	this.setMonth(this.getMonth() + iMonth);
	return this;
}

/*
// Similar to the VB interface
// the following interface conform to: dt - DateTime(DateValue(dt), TimeValue(dt)) == 0
function DateValue(dt)
{
	//return new Date(Date.parse(dt.getFullYear() + "/" + dt.getMonth() + "/" + dt.getDate()));
	return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function TimeValue(dt)
{
	return new Date(0,0,1,dt.getHours(),dt.getMinutes(),dt.getSeconds());
}

function DateTime(d, t)
{
	return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(),t.getMinutes(),t.getSeconds());
}
*/

/**
@fn parseTime(s)

将纯时间字符串生成一个日期对象。

	var dt1 = parseTime("10:10:00");
	var dt2 = parseTime("10:11");

 */
self.parseTime = parseTime;
function parseTime(s)
{
	var a = s.split(":");
	var dt =  new Date(0,0,1, a[0],a[1]||0,a[2]||0);
	if (isNaN(dt.getYear()))
		return null;
	return dt;
}

/**
@fn parseDate(dateStr)

将日期字符串转为日期时间格式。其效果相当于`new Date(Date.parse(dateStr))`，但兼容性更好（例如在safari中很多常见的日期格式无法解析）

示例：

	var dt1 = parseDate("2012-01-01");
	var dt2 = parseDate("2012/01/01 20:00:09");
	var dt3 = parseDate("2012.1.1 20:00");

支持时区，时区格式可以是"+8", "+08", "+0800", "Z"这些，如

	parseDate("2012-01-01T09:10:20.328+0800");
	parseDate("2012-01-01T09:10:20Z");

 */
self.parseDate = parseDate;
function parseDate(str)
{
	if (str == null)
		return null;
	if (str instanceof Date)
		return str;
	if (/Z$/.test(str)) { // "2017-04-22T16:22:50.778Z", 部分浏览器不支持 "2017-04-22T00:00:00+0800"
		return new Date(str);
	}
	var ms = str.match(/^(\d+)(?:[-\/.](\d+)(?:[-\/.](\d+))?)?/);
	if (ms == null)
		return null;
	var y, m, d;
	var now = new Date();
	if (ms[3] !== undefined) {
		y = parseInt(ms[1]);
		m = parseInt(ms[2])-1;
		d = parseInt(ms[3]);
		if (y < 100)
			y += 2000;
	}
	else if (ms[2] !== undefined) {
		y = now.getFullYear();
		m = parseInt(ms[1])-1;
		d = parseInt(ms[2]);
	}
	else {
		y = now.getFullYear();
		m = now.getMonth();
		d = parseInt(ms[1]);
	}
	var h, n, s;
	h=0; n=0; s=0;
	ms = str.match(/(\d+):(\d+)(?::(\d+))?/);
	if (ms != null) {
		h = parseInt(ms[1]);
		n = parseInt(ms[2]);
		if (ms[3] !== undefined)
			s = parseInt(ms[3]);
	}
	var dt = new Date(y, m, d, h, n, s);
	if (isNaN(dt.getYear()))
		return null;
	// 时区(前面必须是时间如 00:00:00.328-02 避免误匹配 2017-08-11 当成-11时区
	ms = str.match(/:[0-9.T]+([+-])(\d{1,4})$/);
	if (ms != null) {
		var sign = (ms[1] == "-"? -1: 1);
		var cnt = ms[2].length;
		var n = parseInt(ms[2].replace(/^0+/, ''));
		if (isNaN(n))
			n = 0;
		else if (cnt > 2)
			n = Math.floor(n/100);
		var tzOffset = sign*n*60 + dt.getTimezoneOffset();
		if (tzOffset)
			dt.addMin(-tzOffset);
	}
	return dt;
}

/**
@fn Date.add(sInterval, n)

为日期对象加几天/小时等。参数n为整数，可以为负数。

@param sInterval Enum. 间隔单位. d-天; m-月; y-年; h-小时; n-分; s-秒

示例：

	var dt = new Date();
	dt.add("d", 1); // 1天后
	dt.add("m", 1); // 1个月后
	dt.add("y", -1); // 1年前
	dt.add("h", 3); // 3小时后
	dt.add("n", 30); // 30分钟后
	dt.add("s", 30); // 30秒后

@see Date.diff
 */
Date.prototype.add = function (sInterval, n)
{
	switch (sInterval) {
	case 'd':
		this.setDate(this.getDate()+n);
		break;
	case 'm':
		this.setMonth(this.getMonth()+n);
		break;
	case 'y':
		this.setFullYear(this.getFullYear()+n);
		break;
	case 'h':
		this.setHours(this.getHours()+n);
		break;
	case 'n':
		this.setMinutes(this.getMinutes()+n);
		break;
	case 's':
		this.setSeconds(this.getSeconds()+n);
		break;
	}
	return this;
}

/**
@fn Date.diff(sInterval, dtEnd)

计算日期到另一日期间的间隔，单位由sInterval指定(具体值列表参见Date.add).

	var dt = new Date();
	...
	var dt2 = new Date();
	var days = dt.diff("d", dt2); // 相隔多少天

@see Date.add
*/
Date.prototype.diff = function(sInterval, dtEnd)
{
	var dtStart = this;
	switch (sInterval) 
	{
		case 'd' :
		{
			var d1 = (dtStart.getTime() - dtStart.getTimezoneOffset()*60000) / 86400000;
			var d2 = (dtEnd.getTime() - dtEnd.getTimezoneOffset()*60000) / 86400000;
			return Math.floor(d2) - Math.floor(d1);
		}	
		case 'm' :return dtEnd.getMonth() - dtStart.getMonth() + (dtEnd.getFullYear()-dtStart.getFullYear())*12;
		case 'y' :return dtEnd.getFullYear() - dtStart.getFullYear();
		case 's' :return Math.round((dtEnd - dtStart) / 1000);
		case 'n' :return Math.round((dtEnd - dtStart) / 60000);
		case 'h' :return Math.round((dtEnd - dtStart) / 3600000);
	}
}

/**
@fn getTimeDiffDscr(tm, tm1)

从tm到tm1的时间差描述，如"2分钟前", "3天前"等。

tm和tm1可以为时间对象或时间字符串
*/
self.getTimeDiffDscr = getTimeDiffDscr;
function getTimeDiffDscr(tm, tm1)
{
	if (!tm || !tm1)
		return "";
	if (! (tm instanceof Date)) {
		tm = parseDate(tm);
	}
	if (! (tm1 instanceof Date)) {
		tm1 = parseDate(tm1);
	}
	var diff = (tm1 - tm) / 1000;
	if (diff < 60) {
		return "刚刚";
	}
	diff /= 60; // 分钟
	if (diff < 60) {
		return Math.floor(diff) + "分钟前";
	}
	diff /= 60; // 小时
	if (diff < 48) {
		return Math.floor(diff) + "小时前";
	}
	diff /= 24; // 天
	if (diff < 365*2)
		return Math.floor(diff) + "天前";
	diff /= 365;
	if (diff < 10)
		return Math.floor(diff) + "年前";
	return "很久前";
}

/**
@fn WUI.getTmRange(dscr, now?)

根据时间段描述得到`[起始时间，结束时间)`，注意结束时间是开区间（即不包含）。
假设今天是2015-9-9 周三：

	getTmRange("本周", "2015-9-9") -> ["2015-9-7"(本周一), "2015-9-14")
	getTmRange("上周") -> ["2015-8-31", "2015-9-7")  // 或"前1周"

	getTmRange("本月") -> ["2015-9-1", "2015-10-1")
	getTmRange("上月") -> ["2015-8-1", "2015-9-1")

	getTmRange("今年") -> ["2015-1-1", "2016-1-1") // 或"本年"
	getTmRange("去年") -> ["2014-1-1", "2015-1-1") // 或"上年"

	getTmRange("本季度") -> ["2015-7-1", "2015-10-1") // 7,8,9三个月
	getTmRange("上季度") -> ["2015-4-1", "2015-7-1")

	getTmRange("上半年") -> ["2015-1-1", "2015-7-1")
	getTmRange("下半年") -> ["2015-7-1", "2016-1-1")

	getTmRange("今天") -> ["2015-9-9", "2015-9-10") // 或"本日"
	getTmRange("昨天") -> ["2015-9-8", "2015-9-9") // 或"昨日"

	getTmRange("前1周") -> ["2015-8-31"(上周一)，"2015-9-7"(本周一))
	getTmRange("前3月") -> ["2015-6-1", "2015-9-1")
	getTmRange("前3天") -> ["2015-9-6", "2015-9-9")

	getTmRange("近1周") -> ["2015-9-3"，"2015-9-10")
	getTmRange("近3月") -> ["2015-6-10", "2015-9-10")
	getTmRange("近3天") -> ["2015-9-6", "2015-9-10")  // "前3天"+今天

dscr可以是 

	"近|前|上" N "个"? "小时|日|周|月|年|季度"
	"本|今" "小时|日/天|周|月|年|季度"

注意："近X周"包括今天（即使尚未过完）。

示例：快捷填充

		<td>
			<select class="cboTmRange">
				<option value ="本月">本月</option>
				<option value ="上月">上月</option>
				<option value ="本周">本周</option>
				<option value ="上周">上周</option>
				<option value ="今年">今年</option>
				<option value ="去年">去年</option>
			</select>
		</td>

	var txtTmRange = jdlg.find(".cboTmRange");
	txtTmRange.change(function () {
		var range = WUI.getTmRange(this.value);
		if (range) {
			WUI.setFormData(jfrm, {tm1: range[0], tm2: range[1]}, {setOnlyDefined: true});
		}
	});
	// 初始选中
	setTimeout(function () {
		txtTmRange.change();
	});

 */
self.getTmRange = getTmRange;
function getTmRange(dscr, now)
{
	if (! now)
		now = new Date();
	else if (! (now instanceof Date)) {
		now = WUI.parseDate(now);
	}
	else {
		now = new Date(now); // 不修改原时间
	}

	var rv = getTmRangeSimple(dscr, now);
	if (rv)
		return rv;

	dscr = dscr.replace(/本|今/, "前0");
	dscr = dscr.replace(/上|昨/, "前");
	var re = /(近|前)(\d*).*?(小时|日|天|月|周|年)/;
	var m = dscr.match(re);
	if (! m)
		return;
	
	var dt1, dt2, dt;
	var type = m[1];
	var n = parseInt(m[2] || '1');
	var u = m[3];
	var fmt_d = "yyyy-mm-dd";
	var fmt_h = "yyyy-mm-dd HH:00";
	var fmt_m = "yyyy-mm-01";
	var fmt_y = "yyyy-01-01";

	if (u == "小时") {
		if (n == 0) {
			now.add("h",1);
			n = 1;
		}
		if (type == "近") {
			now.add("h",1);
		}
		dt2 = now.format(fmt_h);
		dt1 = now.add("h", -n).format(fmt_h);
	}
	else if (u == "日" || u == "天") {
		if (n == 0 || type == "近") {
			now.addDay(1);
			++ n;
		}
		dt2 = now.format(fmt_d);
		dt1 = now.add("d", -n).format(fmt_d);
	}
	else if (u == "月") {
		if (n == 0) {
			now.addMonth(1);
			n = 1;
		}
		if (type == "近") {
			now.addDay(1);
			var d2 = now.getDate();
			dt2 = now.format(fmt_d);
			now.add("m", -n);
			do {
				// 5/31近一个月, 从4/30开始: [4/30, 5/31]
				var d1 = now.getDate();
				if (d1 == d2 || d1 > 10)
					break;
				now.addDay(-1);
			} while (true);
			dt1 = now.format(fmt_d);
			
			// now = WUI.parseDate(now.format(fmt_m)); // 回到1号
			//dt1 = now.add("m", -n).format(fmt_m);
		}
		else if (type == "前") {
			dt2 = now.format(fmt_m);
			dt1 = WUI.parseDate(dt2).add("m", -n).format(fmt_m);
		}
	}
	else if (u == "周") {
		if (n == 0) {
			now.addDay(7);
			n = 1;
		}
		if (type == "近") {
			now.addDay(1);
			dt2 = now.format(fmt_d);
			//now.add("d", -now.getDay()+1); // 回到周1
			dt1 = now.add("d", -n*7).format(fmt_d);
		}
		else if (type == "前") {
			dt2 = now.add("d", -now.getDay()+1).format(fmt_d);
			dt1 = now.add("d", -7*n).format(fmt_d);
		}
	}
	else if (u == "年") {
		if (n == 0) {
			now.add("y",1);
			n = 1;
		}
		if (type == "近") {
			now.addDay(1);
			dt2 = now.format(fmt_d);
			//now = WUI.parseDate(now.format(fmt_y)); // 回到1/1
			dt1 = now.add("y", -n).format(fmt_d);
		}
		else if (type == "前") {
			dt2 = now.format(fmt_y);
			dt1 = WUI.parseDate(dt2).add("y", -n).format(fmt_y);
		}
	}
	else {
		return;
	}
	return [dt1, dt2];
}

function getTmRangeSimple(dscr, now)
{
	var fmt_d = "yyyy-mm-dd";
	var fmt_m = "yyyy-mm-01";
	var fmt_y = "yyyy-01-01";

	if (dscr == "本月") {
		var dt1 = now.format(fmt_m);
		// NOTE: 不要用 now.addMonth(1). 否则: 2020/8/31取本月会得到 ["2020-08-01", "2020-10-01"]
		var y = now.getFullYear();
		var m = now.getMonth() + 2;
		if (m == 12) {
			++ y;
			m = 1;
		}
		var dt2 = y + "-" + setWidth_2(m) + "-01";
	}
	else if (dscr == "上月") {
		var dt2 = now.format(fmt_m);
		var y = now.getFullYear();
		var m = now.getMonth();
		now.addMonth(-1);
		if (m == 0) {
			-- y;
			m = 12;
		}
		var dt1 = y + "-" + setWidth_2(m) + "-01";
	}
	else if (dscr == "本周") {
		var dt1 = now.add("d", -(now.getDay()||7)+1).format(fmt_d);
		now.addDay(7);
		var dt2 = now.format(fmt_d);
	}
	else if (dscr == "上周") {
		var dt2 = now.add("d", -(now.getDay()||7)+1).format(fmt_d);
		now.addDay(-7);
		var dt1 = now.format(fmt_d);
	}
	else if (dscr == "今年") {
		var dt1 = now.format(fmt_y);
		now.addMonth(12);
		var dt2 = now.format(fmt_y);
	}
	else if (dscr == "去年" || dscr == "上年") {
		var dt2 = now.format(fmt_y);
		now.addMonth(-12);
		var dt1 = now.format(fmt_y);
	}
	else if (dscr == "本季度") {
		var m = Math.floor(now.getMonth() / 3)*3 +1;
		var dt1 = now.getFullYear() + "-" + setWidth_2(m) + "-01";
		var dt2 = now.getFullYear() + "-" + setWidth_2(m+3) + "-01";
	}
	else if (dscr == "上季度") {
		var m = Math.floor(now.getMonth() / 3)*3;
		if (m > 0) {
			var dt1 = now.getFullYear() + "-" + setWidth_2(m-3) + "-01";
			var dt2 = now.getFullYear() + "-" + setWidth_2(m) + "-01";
		}
		else {
			var y = now.getFullYear();
			var dt1 = (y-1) + "-10-01";
			var dt2 = y + "-01-01";
		}
	}
	else if (dscr == "上半年") {
		var y = now.getFullYear();
		var dt1 = y + "-01-01";
		var dt2 = y + "-07-01";
	}
	else if (dscr == "下半年") {
		var y = now.getFullYear();
		var dt1 = y + "-07-01";
		var dt2 = (y+1) + "-01-01";
	}
	else {
		return;
	}
	return [dt1, dt2];
}

// }}}

// ====== Cookie and Storage (localStorage/sessionStorage) {{{
/**
@fn setCookie(name, value, days?=30)

设置cookie值。如果只是为了客户端长时间保存值，一般建议使用 setStorage.

@see getCookie
@see delCookie
@see setStorage
*/
self.setCookie = setCookie;
function setCookie(name,value,days)
{
	if (days===undefined)
		days = 30;
	if (value == null)
	{
		days = -1;
		value = "";
	}
	var exp  = new Date();
	exp.setTime(exp.getTime() + days*24*60*60*1000);
	document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();
}

/**
@fn getCookie(name)

取cookie值。

@see setCookie
@see delCookie
*/
self.getCookie = getCookie;
function getCookie(name)
{
	var m = document.cookie.match(new RegExp("(^| )"+name+"=([^;]*)(;|$)"));
	if(m != null) {
		return (unescape(m[2]));
	} else {
		return null;
	}
}

/**
@fn delCookie(name)

删除一个cookie项。

@see getCookie
@see setCookie
*/
self.delCookie = delCookie;
function delCookie(name)
{
	if (getCookie(name) != null) {
		setCookie(name, null, -1);
	}
}

/**
@fn setStorage(name, value, useSession?=false)

使用localStorage存储(或使用sessionStorage存储, 如果useSession=true)。
value可以是简单类型，也可以为数组，对象等，后者将自动在序列化后存储。 

如果设置了window.STORAGE_PREFIX, 则键值(name)会加上该前缀.

示例：

	setStorage("id", "100");
	var id = getStorage("id");
	delStorage("id");

示例2：存储对象:

	window.STORAGE_PREFIX = "jdcloud_"; // 一般在app.js中全局设置
	var obj = {id:10, name:"Jason"};
	setStorage("obj", obj);   // 实际存储键值为 "jdcloud_obj"
	var obj2 = getStorage("obj");
	alert(obj2.name);

@var STORAGE_PREFIX 本地存储的键值前缀

如果指定, 则调用setStorage/getStorage/delStorage时都将自动加此前缀, 避免不同项目的存储项冲突.

@see getStorage
@see delStorage
*/
self.setStorage = setStorage;
function setStorage(name, value, useSession)
{
	if ($.isPlainObject(value) || $.isArray(value)) {
		value = JSON.stringify(value);
	}
	assert(typeof value != "object", "value must be scalar!");
	if (window.STORAGE_PREFIX)
		name = window.STORAGE_PREFIX + name;
	if (useSession)
		sessionStorage.setItem(name, value);
	else
		localStorage.setItem(name, value);
}

/**
@fn getStorage(name, useSession?=false)

取storage中的一项。
默认使用localStorage存储，如果useSession=true，则使用sessionStorage存储。

如果浏览器不支持Storage，则使用cookie实现.

@see setStorage
@see delStorage
*/
self.getStorage = getStorage;
function getStorage(name, useSession)
{
	if (window.STORAGE_PREFIX)
		name = window.STORAGE_PREFIX + name;

	var value;
	if (useSession)
		value = sessionStorage.getItem(name);
	else
		value = localStorage.getItem(name);

	if (typeof(value)=="string" && (value[0] == '{' || value[0] == '['))
		value = JSON.parse(value);
	return value;
}

/**
@fn delStorage(name)

删除storage中的一项。

@see getStorage
@see setStorage
*/
self.delStorage = delStorage;
function delStorage(name, useSession)
{
	if (window.STORAGE_PREFIX)
		name = window.STORAGE_PREFIX + name;
	if (useSession)
		sessionStorage.removeItem(name);
	else
		localStorage.removeItem(name);
}
//}}}

// ====== rs object {{{
/**
@fn rs2Array(rs)

@param rs={h=[header], d=[ @row ]} rs对象(RowSet)
@return arr=[ %obj ]

rs对象用于传递表格，包含表头与表内容。
函数用于将服务器发来的rs对象转成数组。

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"] ] 
	};
	var arr = rs2Array(rs); 

	// 结果为
	arr = [
		{id: 100, name: "Tom"},
		{id: 101, name: "Jane"} 
	];

@see rs2Hash
@see rs2MultiHash
*/
self.rs2Array = rs2Array;
function rs2Array(rs)
{
	var ret = [];
	var colCnt = rs.h.length;

	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		ret.push(obj);
	}
	return ret;
}

/**
@fn rs2Hash(rs, key)

@param rs={h, d}  rs对象(RowSet)
@return hash={key => %obj}

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"] ] 
	};
	var hash = rs2Hash(rs, "id"); 

	// 结果为
	hash = {
		100: {id: 100, name: "Tom"},
		101: {id: 101, name: "Jane"}
	};

key可以为一个函数，返回实际key值，示例：

	var hash = rs2Hash(rs, function (o) {
		return "USER-" + o.id;
	}); 

	// 结果为
	hash = {
		"USER-100": {id: 100, name: "Tom"},
		"USER-101": {id: 101, name: "Jane"}
	};

key函数也可以返回[key, value]数组：

	var hash = rs2Hash(rs, function (o) {
		return ["USER-" + o.id, o.name];
	}); 

	// 结果为
	hash = {
		"USER-100": "Tom",
		"USER-101": "Jane"
	};

@see rs2Array
*/
self.rs2Hash = rs2Hash;
function rs2Hash(rs, key)
{
	var ret = {};
	var colCnt = rs.h.length;
	var keyfn;
	if (typeof(key) == "function")
		keyfn = key;
	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		var k = keyfn?  keyfn(obj): obj[key];
		if (Array.isArray(k) && k.length == 2)
			ret[k[0]] = k[1];
		else
			ret[ k ] = obj;
	}
	return ret;
}

/**
@fn rs2MultiHash(rs, key)

数据分组(group by).

@param rs={h, d}  rs对象(RowSet)
@return hash={key => [ %obj ]}

示例：

	var rs = {
		h: ["id", "name"], 
		d: [ [100, "Tom"], [101, "Jane"], [102, "Tom"] ] 
	};
	var hash = rs2MultiHash(rs, "name");  

	// 结果为
	hash = {
		"Tom": [{id: 100, name: "Tom"}, {id: 102, name: "Tom"}],
		"Jane": [{id: 101, name: "Jane"}]
	};

key也可以是一个函数，返回实际的key值，示例，按生日年份分组：

	var rs = {
		h: ["id", "name", "birthday"], 
		d: [ [100, "Tom", "1998-10-1"], [101, "Jane", "1999-1-10"], [102, "Tom", "1998-3-8"] ] 
	};
	// 按生日年份分组
	var hash = rs2MultiHash(rs, function (o) {
		var m = o.birthday.match(/^\d+/);
		return m && m[0];
	});

	// 结果为
	hash = {
		"1998": [{id: 100, name: "Tom", birthday: "1998-10-1"}, {id: 102, name: "Tom", birthday:"1998-3-8"}],
		"1999": [{id: 101, name: "Jane", birthday: "1999-1-10"}]
	};

key作为函数，也可返回[key, value]:

	var hash = rs2MultiHash(rs, function (o) {
		return [o.name, [o.id, o.birthday]];
	});

	// 结果为
	hash = {
		"Tom": [[100, "1998-10-1"], [102, "1998-3-8"]],
		"Jane": [[101, "1999-1-10"]]
	};


@see rs2Hash
@see rs2Array
*/
self.rs2MultiHash = rs2MultiHash;
function rs2MultiHash(rs, key)
{
	var ret = {};
	var colCnt = rs.h.length;
	var keyfn;
	if (typeof(key) == "function")
		keyfn = key;
	for (var i=0; i<rs.d.length; ++i) {
		var obj = {};
		var row = rs.d[i];
		for (var j=0; j<colCnt; ++j) {
			obj[rs.h[j]] = row[j];
		}
		var k = keyfn?  keyfn(obj): obj[key];
		if (Array.isArray(k) && k.length == 2) {
			obj = k[1];
			k = k[0];
		}
		if (ret[ k ] === undefined)
			ret[ k ] = [obj];
		else
			ret[ k ].push(obj);
	}
	return ret;
}

/**
@fn list2varr(ls, colSep=':', rowSep=',')

- ls: 代表二维表的字符串，有行列分隔符。
- colSep, rowSep: 列分隔符，行分隔符。

将字符串代表的压缩表("v1:v2:v3,...")转成对象数组。

e.g.

	var users = "101:andy,102:beddy";
	var varr = list2varr(users);
	// varr = [["101", "andy"], ["102", "beddy"]];
	var arr = rs2Array({h: ["id", "name"], d: varr});
	// arr = [ {id: 101, name: "andy"}, {id: 102, name: "beddy"} ];
	
	var cmts = "101\thello\n102\tgood";
	var varr = list2varr(cmts, "\t", "\n");
	// varr=[["101", "hello"], ["102", "good"]]
 */
self.list2varr = list2varr;
function list2varr(ls, sep, sep2)
{
	if (sep == null)
		sep = ':';
	if (sep2 == null)
		sep2 = ',';
	var ret = [];
	$.each(ls.split(sep2), function () {
		if (this.length == 0)
			return;
		ret.push(this.split(sep));
	});
	return ret;
}

/**
@fn objarr2list(objarr, fields, sep=':', sep2=',')

将对象数组转成字符串代表的压缩表("v1:v2:v3,...")。

示例：

	var objarr = [
		{id:100, name:'name1', qty:2},
		{id:101, name:'name2', qty:3}
	];
	var list = objarr2list(objarr, ["id","qty"]);
	// 返回"100:2,101:3"

	var list2 = objarr2list(objarr, function (e, i) { return e.id + ":" + e.qty; });
	// 结果同上
 */
self.objarr2list = objarr2list;
function objarr2list(objarr, fields, sep, sep2)
{
	sep = sep || ':';
	sep2 = sep2 || ',';

	var fn = $.isFunction(fields) ? fields : function (e, i) {
		var row = '';
		$.each(fields, function (j, e1) {
			if (row.length > 0)
				row += sep;
			row += e[e1];
		});
		return row;
	};
	return $.map(objarr, fn).join(sep2);
}


//}}}

/**
@fn intSort(a, b)

整数排序. 用于datagrid column sorter:

	<th data-options="field:'id', sortable:true, sorter:intSort">编号</th>

 */
self.intSort = intSort;
function intSort(a, b)
{
	return (parseInt(a)||0) - (parseInt(b)||0);
}

/**
@fn numberSort(a, b)

小数排序. 用于datagrid column sorter:

	<th data-options="field:'score', sortable:true, sorter:numberSort">评分</th>

 */
self.numberSort = numberSort;
function numberSort(a, b)
{
	return (parseFloat(a)||0) - (parseFloat(b)||0);
}

/**
@fn getAncestor(o, fn)

取符合条件(fn)的对象，一般可使用$.closest替代
*/
self.getAncestor = getAncestor;
function getAncestor(o, fn)
{
	while (o) {
		if (fn(o))
			return o;
		o = o.parentElement;
	}
	return o;
}

/**
@fn appendParam(url, param)

示例:

	var url = "http://xxx/api.php";
	if (a)
		url = appendParam(url, "a=" + a);
	if (b)
		url = appendParam(url, "b=" + b);

	appendParam(url, $.param({a:1, b:3}));

支持url中带有"?"或"#"，如

	var url = "http://xxx/api.php?id=1#order";
	appendParam(url, "pay=1"); // "http://xxx/api.php?id=1&pay=1#order";

*/
self.appendParam = appendParam;
function appendParam(url, param)
{
	if (param == null)
		return url;
	var ret;
	var a = url.split("#");
	ret = a[0] + (url.indexOf('?')>=0? "&": "?") + param;
	if (a.length > 1) {
		ret += "#" + a[1];
	}
	return ret;
}

/**
@fn deleteParam(url, paramName)

示例:

	var url = "http://xxx/api.php?a=1&b=3&c=2";
	var url1 = deleteParam(url, "b"); // "http://xxx/api.php?a=1&c=2";

	var url = "http://server/jdcloud/m2/?logout#me";
	var url1 = deleteParam(url, "logout"); // "http://server/jdcloud/m2/?#me"

*/
self.deleteParam = deleteParam;
function deleteParam(url, paramName)
{
	var ret = url.replace(new RegExp('&?\\b' + paramName + "\\b(=[^&#]+)?"), '');
	ret = ret.replace(/\?&/, '?');
	// ret = ret.replace(/\?(#|$)/, '$1'); // 问号不能去掉，否则history.replaceState(null,null,"#xxx")会无效果
	return ret;
}

/** @fn isWeixin()
当前应用运行在微信中。
*/
self.isWeixin = isWeixin;
function isWeixin()
{
	return /micromessenger/i.test(navigator.userAgent);
}

/** @fn isIOS()
当前应用运行在IOS平台，如iphone或ipad中。
*/
self.isIOS = isIOS;
function isIOS()
{
	return /iPhone|iPad/i.test(navigator.userAgent);
}

/** @fn isAndroid()
当前应用运行在安卓平台。
*/
self.isAndroid = isAndroid;
function isAndroid()
{
	return /Android/i.test(navigator.userAgent);
}

/**
@fn parseValue(str)

如果str符合整数或小数，则返回相应类型。
 */
self.parseValue = parseValue;
function parseValue(str)
{
	if (str == null)
		return str;
	var val = str;
	if (/^-?[0-9]+$/.test(str)) {
		val = parseInt(str);
	}
	if (/^-?[0-9.]+$/.test(str)) {
		val = parseFloat(str);
	}
	return val;
}

/**
@fn applyTpl(tpl, data)

对模板做字符串替换

	var tpl = "<li><p>{name}</p><p>{dscr}</p></li>";
	var data = {name: 'richard', dscr: 'hello'};
	var html = applyTpl(tpl, data);
	// <li><p>richard</p><p>hello</p></li>

*/
self.applyTpl = applyTpl;
function applyTpl(tpl, data)
{
	// 支持中文，不能直接用\w匹配
	return tpl.replace(/{([^{}:,.]+)}/g, function(m0, m1) {
		return data[m1];
	});
}

/**
@fn delayDo(fn, delayCnt?=3)

设置延迟执行。当delayCnt=1时与setTimeout效果相同。
多次置于事件队列最后，一般3次后其它js均已执行完毕，为idle状态
*/
self.delayDo = delayDo;
function delayDo(fn, delayCnt)
{
	if (delayCnt == null)
		delayCnt = 3;
	doIt();
	function doIt()
	{
		if (delayCnt == 0)
		{
			fn();
			return;
		}
		-- delayCnt;
		setTimeout(doIt);
	}
}

/**
@fn kvList2Str(kv, sep, sep2)

e.g.

	var str = kvList2Str({"CR":"Created", "PA":"Paid"}, ';', ':');
	// str="CR:Created;PA:Paid"

 */
self.kvList2Str = kvList2Str;
function kvList2Str(kv, sep, sep2)
{
	var ret = '';
	$.each(kv, function (k, v) {
		if (typeof(v) != "function") {
			if (ret)
				ret += sep;
			ret += k  + sep2 + v;
		}
	});
	return ret;
}

/**
@fn parseKvList(kvListStr, sep, sep2, doReverse?) -> kvMap

解析key-value列表字符串，返回kvMap。

- doReverse: 设置为true时返回反向映射

示例：

	var map = parseKvList("CR:新创建;PA:已付款", ";", ":");
	// map: {"CR": "新创建", "PA":"已付款"}

	var map = parseKvList("CR:新创建;PA:已付款", ";", ":", true);
	// map: {"新创建":"CR", "已付款":"PA"}
*/
self.parseKvList = parseKvList;
function parseKvList(str, sep, sep2, doReverse)
{
	var map = {};
	$.each(str.split(sep), function (i, e) {
		var kv = e.split(sep2, 2);
		//assert(kv.length == 2, "bad kvList: " + str);
		if (kv.length < 2) {
			kv[1] = kv[0];
		}
		if (!doReverse)
			map[kv[0]] = kv[1];
		else
			map[kv[1]] = kv[0];
	});
	return map;
}

/**
@fn Q(str, q?="'")

	Q("abc") -> 'abc'
	Q("a'bc") -> 'a\'bc'

 */
window.Q = self.Q = Q;
function Q(str, q)
{
	if (str == null)
		return "null";
	if (typeof str == "number")
		return str;
	if (q == null)
		q = "'";
	return q + str.toString().replaceAll(q, "\\" + q) + q;
}

function initModule()
{
	// bugfix: 浏览器兼容性问题
	if (String.prototype.startsWith == null) {
		String.prototype.startsWith = function (s) { return this.substr(0, s.length) == s; }
	}

	if (window.console === undefined) {
		window.console = {
			log:function () {}
		}
	}
}
initModule();

/**
@fn text2html(str, pics)

将文本或图片转成html，常用于将筋斗云后端返回的图文内容转成html在网页中显示。示例：

	var item = {id: 1, name: "商品1", content: "商品介绍内容", pics: "100,102"};
	var html = MUI.text2html(item.content, item.pics);
	jpage.find("#content").html(html);

文字转html示例：

	var html = MUI.text2html("hello\nworld");

生成html为

	<p>hello</p>
	<p>world</p>

支持简单的markdown格式，如"# ","## "分别表示一二级标题, "- "表示列表（注意在"#"或"-"后面有英文空格）：
	
	# 标题1
	内容1
	# 标题2
	内容2

	- 列表1
	- 列表2

函数可将图片编号列表转成img列表，如：

	var html = MUI.text2html(null, "100,102");

生成

	<img src="../api.php/att?thumbId=100">
	<img src="../api.php/att?thumbId=102">

 */
self.text2html = text2html;
function text2html(s, pics)
{
	var ret = "";
	if (s) {
		ret = s.replace(/^(?:([#-]+)\s+)?(.*)$/mg, function (m, begin, text) {
			if (begin) {
				if (begin[0] == '#') {
					n = begin.length;
					return "<h" + n + ">" + text + "</h" + n + ">";
				}
				if (begin[0] == '-') {
					return "<li>" + text + "</li>";
				}
			}
			// 空段落处理
			if (text) {
				text = text.replace(" ", "&nbsp;");
			}
			else {
				text = "&nbsp;";
			}
			return "<p>" + text + "</p>";
		}) + "\n";
	}
	if (pics) {
		var arr = pics.split(/\s*,\s*/);
		arr.forEach(function (e) {
			var url = "../api.php/att?thumbId=" + e;
			ret += "<img src=\"" + url + "\">\n";
		});
	}
	return ret;
}

/**
@fn extendNoOverride(a, b, ...)

	var a = {a: 1};
	WUI.extendNoOverride(a, {b: 'aa'}, {a: 99, b: '33', c: 'bb'});
	// a = {a: 1, b: 'aa', c: 'bb'}
 */
self.extendNoOverride = extendNoOverride;
function extendNoOverride(target)
{
	if (!target)
		return target;
	$.each(arguments, function (i, e) {
		if (i == 0 || !$.isPlainObject(e))
			return;
		$.each(e, function (k, v) {
			if (target[k] === undefined)
				target[k] = v;
		});
	});
	return target;
}

}/*jdcloud common*/

/**
@fn jdModule(name?, fn?)

定义JS模块。这是一个全局函数。

定义一个模块:

	jdModule("jdcloud.common", JdcloudCommon);
	function JdcloudCommon() {
		var self = this;
		
		// 对外提供一个方法
		self.rs2Array = rs2Array;
		function rs2Array(rs)
		{
			return ...;
		}
	}

获取模块对象:

	var mCommon = jdModule("jdcloud.common");
	var arr = mCommon.rs2Array(rs);

返回模块映射列表。

	var moduleMap = jdModule(); // 返回 { "jdcloud.common": JdcloudCommon, ... }

*/
function jdModule(name, fn, overrideCtor)
{
	if (!window.jdModuleMap) {
		window.jdModuleMap = {};
	}

	if (name == null) {
		return window.jdModuleMap;
	}

	var ret;
	if (typeof(fn) === "function") {
		if (window.jdModuleMap[name]) {
			fn.call(window.jdModuleMap[name]);
		}
		else {
			window.jdModuleMap[name] = new fn();
		}
		ret = window.jdModuleMap[name];
		if (overrideCtor)
			ret.constructor = fn;
		/*
		// e.g. create window.jdcloud.common
		var arr = name.split('.');
		var obj = window;
		for (var i=0; i<arr.length; ++i) {
			if (i == arr.length-1) {
				obj[arr[i]] = ret;
				break;
			}
			if (! (arr[i] in obj)) {
				obj[arr[i]] = {};
			}
			obj = obj[arr[i]];
		}
		*/
	}
	else {
		ret = window.jdModuleMap[name];
		if (!ret) {
			throw "load module fails: " + name;
		}
	}
	return ret;
}

if (! String.prototype.replaceAll) {
	String.prototype.replaceAll = function (from, to) {
		return this.replace(new RegExp(from, "g"), to);
	}
}

// vi: foldmethod=marker 
// ====== WEBCC_END_FILE common.js }}}

// ====== WEBCC_BEGIN_FILE commonjq.js {{{
jdModule("jdcloud.common", JdcloudCommonJq);
function JdcloudCommonJq()
{
var self = this;

self.assert(window.jQuery, "require jquery lib.");
var mCommon = jdModule("jdcloud.common");

/**
@fn getFormData(jo, doGetAll)

取DOM对象中带name属性的子对象的内容, 放入一个JS对象中, 以便手工调用callSvr.

注意: 

- 这里Form不一定是Form标签, 可以是一切DOM对象.
- 如果DOM对象有disabled属性, 则会忽略它, 这也与form提交时的规则一致.

与setFormData配合使用时, 可以只返回变化的数据.

	jf.submit(function () {
		var ac = jf.attr("action");
		callSvr(ac, fn, getFormData(jf));
	});

在dialog的onValidate/onOk回调中，由于在显示对话框时自动调用过setFormData，所以用getFormData只返回有修改变化的数据。如果要取所有数据可设置参数doGetAll=true:

	var data = WUI.getFormData(jfrm, true);

这也只返回非disabled的组件，如果包括disabled组件的值也需要，可以用

	var data = WUI.getFormData(jfrm, "all");

如果在jo对象中存在有name属性的file组件(input[type=file][name])，或指定了属性enctype="multipart/form-data"，则调用getFormData会返回FormData对象而非js对象，
再调用callSvr时，会以"multipart/form-data"格式提交数据。一般用于上传文件。
示例：

	<div>
		课程文档
		<input name="pdf" type="file" accept="application/pdf">
	</div>

或传统地：

	<form method="POST" enctype='multipart/form-data'>
		课程文档
		<input name="pdf" type="file" accept="application/pdf">
	</form>

如果有多个同名组件（name相同，且非disabled状态），最终值将以最后组件为准。
如果想要以数组形式返回所有值，应在名字上加后缀"[]"，示例：

	行统计字段: <select name="gres[]" class="my-combobox fields"></select>
	行统计字段2: <select name="gres[]" class="my-combobox fields"></select>
	列统计字段: <select name="gres2" class="my-combobox fields"></select>
	列统计字段2: <select name="gres2" class="my-combobox fields"></select>

取到的结果示例：

	{ gres: ["id", "name"], gres2: "name" }

@see setFormData
 */
self.getFormData = getFormData;
function getFormData(jo, doGetAll)
{
	var data = {};
	var isFormData = false;
	var enctype = jo.attr("enctype");
	if ( (enctype && enctype.toLowerCase() == "multipart/form-data") || jo.has("[name]:file").size() >0) {
		isFormData = true;
		data = new FormData();
	}
	var orgData = jo.data("origin_") || {};
	formItems(jo, function (ji, name, it) {
		if (doGetAll != "all" && it.getDisabled())
			return;
		var orgContent = orgData[name];
		if (orgContent == null)
			orgContent = "";
		var content = it.getValue();
		if (content == null)
			content = "";
		if (doGetAll || content !== String(orgContent)) // 避免 "" == 0 或 "" == false
		{
			if (! isFormData) {
				// URL参数支持数组，如`a[]=hello&a[]=world`，表示数组`a=["hello","world"]`
				if (name.substr(-2) == "[]") {
					name = name.substr(0, name.length-2);
					if (! data[name]) {
						data[name] = [];
					}
					data[name].push(content);
				}
				else {
					data[name] = content;
				}
			}
			else {
				if (ji.is(":file")) {
					// 支持指定multiple，如  <input name="pdf" type="file" multiple accept="application/pdf">
					$.each(ji.prop("files"), function (i, e) {
						data.append(name, e);
					});
				}
				else {
					data.append(name, content);
				}
			}
		}
	});
	return data;
}

/**
@fn getFormData_vf(jo)

专门取虚拟字段的值。例如：

	<select name="whId" class="my-combobox" data-options="url:..., jd_vField:'whName'"></select>

用WUI.getFormData可取到`{whId: xxx}`，而WUI.getFormData_vf遍历带name属性且设置了jd_vField选项的控件，调用接口getValue_vf(ji)来取其显示值。
因而，为支持取虚拟字段值，控件须定义getValue_vf接口。

	<input name="orderType" data-options="jd_vField:'orderType'" disabled>

注意：与getFormData不同，它不忽略有disabled属性的控件。

@see defaultFormItems
 */
self.getFormData_vf = getFormData_vf;
function getFormData_vf(jo)
{
	var data = {};
	formItems(jo, function (ji, name, it) {
		var vname = WUI.getOptions(ji).jd_vField;
		if (!vname)
			return;
		data[vname] = it.getValue_vf();
	});
	return data;
}

/**
@fn formItems(jo, cb)

表单对象遍历。对表单jo（实际可以不是form标签）下带name属性的控件，交给回调cb处理。

注意:

- 通过取getDisabled接口判断，可忽略有disabled属性的控件以及未选中的checkbox/radiobutton。

对于checkbox，设置时根据val确定是否选中；取值时如果选中取value属性否则取value-off属性。
缺省value为"on", value-off为空(非标准属性，本框架支持)，可以设置：

	<input type="checkbox" name="flag" value="1">
	<input type="checkbox" name="flag" value="1" value-off="0">

@param cb(ji, name, it) it.getDisabled/setDisabled/getValue/setValue/getShowbox
当cb返回false时可中断遍历。

示例：

	WUI.formItems(jdlg.find(".my-fixedField"), function (ji, name, it) {
		var fixedVal = ...
		if (fixedVal || fixedVal == '') {
			it.setReadonly(true);
			var forAdd = beforeShowOpt.objParam.mode == FormMode.forAdd;
			if (forAdd) {
				it.setValue(fixedVal);
			}
		}
		else {
			it.setReadonly(false);
		}
	});

@fn getFormItem(ji)

获取对话框上一个组件的访问器。示例，设置名为orderId的组件值：

	var ji = jdlg.find("[name=orderId]"); // 或者用 var ji = $(frm.orderId);
	var it = WUI.getFormItem(ji);
	it.setValue("hello"); // 类似于ji.val("hello")，但支持各种复杂组件


还可以用更简洁的jo.gn，以及支持用链式风格的调用：

	var it = jdlg.gn("orderId");
	it.val("hello").disabled(true); // 等价于 it.setValue("hello");  it.setDisabled(true);

@see jQuery.fn.gn(name?)

@var getFormItemExt

可通过扩展`WUI.getFormItemExt[新类型]`来为表单扩展其它类型控件。示例：

	WUI.getFormItemExt["myinput"] = function (ji) {
		if (ji.hasClass("myinput"))
			return new MyInputFormItem(ji);
	}
	function MyInputFormItem(ji) {
		WUI.FormItem.call(this, ji);
	}
	MyInputFormItem.prototype = $.extend(new WUI.FormItem(), {
		getValue: function () {
			return this.ji.val();
		}
	});
 */
self.formItems = formItems;
self.getFormItemExt = {};
self.getFormItem = getFormItem;
function getFormItem(ji)
{
	var ret;
	$.each(self.getFormItemExt, function (k, ext) {
		var rv = ext(ji);
		if (rv !== undefined) {
			ret = rv;
			return false;
		}
	});
	return ret || new FormItem(ji);
}

self.FormItem = FormItem;
function FormItem(ji) {
	this.ji = ji;
}

// { ji }
FormItem.prototype = {
	getName: function () {
		var jo = this.ji;
		return jo.attr("name") || jo.prop("name");
	},
	getJo: function () {
		return this.ji;
	},
	getDisabled: function () {
		var jo = this.ji;
		var val = jo.prop("disabled");
		if (val === undefined)
			val = jo.attr("disabled");
		var o = jo[0];
		if (! val && o.tagName == "INPUT") {
			if (o.type == "radio" && !o.checked)
				return true;
		}
		return val;
	},
	setDisabled: function (val) {
		var jo = this.ji;
		jo.prop("disabled", !!val);
		if (val)
			jo.attr("disabled", "disabled");
		else
			jo.removeAttr("disabled");
	},
	getReadonly: function () {
		var jo = this.ji;
		var val = jo.prop("readonly");
		if (val === undefined)
			val = jo.attr("readonly");
		return val;
	},
	setReadonly: function (val) {
		var jo = this.ji;
		jo.prop("readonly", !!val);
		if (val)
			jo.attr("readonly", "readonly");
		else
			jo.removeAttr("readonly");
	},
	setValue: function (val) {
		var jo = this.ji;
		var isInput = jo.is(":input");
		if (val === undefined) {
			if (isInput) {
				var o = jo[0];
				// 取初始值
				if (o.tagName === "TEXTAREA")
					val = jo.html();
				else if (! (o.tagName == "INPUT") && (o.type == "hidden")) // input[type=hidden]对象比较特殊：设置property value后，attribute value也会被设置。
					val = jo.attr("value");
				if (val === undefined)
					val = "";
			}
			else {
				val = "";
			}
		}
		if (jo.is(":checkbox")) {
			jo.prop("checked", mCommon.tobool(val));
		}
		else if (isInput) {
			jo.val(val);
		}
		else {
			jo.html(val);
		}
	},
	getValue: function (jo) {
		var jo = this.ji;
		var val;
		if (jo.is(":checkbox")) {
			val = jo.prop("checked")? jo.val(): jo.attr("value-off");
			if (val === "on")
				val = 1;
			/* NOTE: 复选框特别行为：如果不选则无值
			if (val === undefined)
				val = 0;
			*/
		}
		else if (jo.is(":input")) {
			val = jo.val();
		}
		else {
			val = jo.html();
		}
		return val;
	},
	// 用于find模式设置。搜索"设置find模式"/datetime
	getShowbox: function () {
		return this.ji;
	},

	// 用于显示的虚拟字段值, 此处以select为例，适用于my-combobox
	getValue_vf: function () {
		var jo = this.ji;
		var o = jo[0];
		if (o.tagName == "SELECT")
			return o.selectedIndex >= 0 ? o.options[o.selectedIndex].innerText : '';
		return this.getValue(jo);
	},
	getTitle: function () {
		return this.ji.closest("td").prev("td").html();
	},
	setFocus: function () {
		var j1 = this.getShowbox();
		if (j1.is(":hidden")) {
			selectTab(j1);
		}
		j1.focus();
	},

	// 链式接口
	val: function (v) {
		if (v === undefined)
			return this.getValue();
		this.setValue(v);
		return this;
	},
	disabled: function (v) {
		if (v === undefined)
			return this.getDisabled();
		this.setDisabled(v);
		return this;
	},
	readonly: function (v) {
		if (v === undefined)
			return this.getReadonly();
		this.setReadonly(v);
		return this;
	},
	visible: function (v) {
		var jp = this.ji.closest("tr,.wui-field");
		if (v === undefined) {
			return this.ji.css("display") != "none" && jp.css("display") != "none";
			//return jp.is(":visible");
		}
		jp.toggle(!!v);
		return this;
	},
	setOption: function (v) {
		if (!$.isPlainObject(v))
			return;
		this.getJo().trigger("setOption", v);
		return this;
		// for: combo, subobj
		//WUI.setOptions(ji, v);
	}
};

// jo是tabs下的某个组件
function selectTab(jo)
{
	var jtabs = jo.closest(".easyui-tabs");
	if (jtabs.size() == 0)
		return;
	var idx = -1;
	jtabs.find(">.tabs-panels>.panel").each(function (idx1) {
		if (jo.closest(this).size() > 0) {
			idx = idx1;
			return true;
		}
	});
	if (idx < 0)
		return;
	jtabs.tabs("select", idx);
}

/**
@fn jQuery.fn.gn(name?)

按名字访问组件（gn表示getElementByName），返回访问器（iterator），用于对各种组件进行通用操作。

示例：

	var it = jdlg.gn("orderId"); 
	var v = it.val(); // 取值，相当于 jdlg.find("[name=orderId]").val(); 但兼容my-combobox, wui-combogrid, wui-subobj等复杂组件。
	it.val(100); // 设置值
	// it.val([100, "ORDR-100"]); // 对于combogrid, 可以传数组，同时设置value和text

	var isVisible = it.visible(); // 取是否显示
	it.visible(false); // 设置隐藏

	var isDisabled = it.disabled();
	it.disabled(true);

	var isReadonly = it.readonly();
	it.readonly(true);

如果未指定name，则以jQuery对象本身作为组件返回访问器。所以也可以这样用：

	var jo = jdlg.find("[name=orderId]");
	var it = jo.gn(); // name可以省略，表示取自身
	it.val(100);

*/
jQuery.fn.gn = function (name) {
	var ji = name? this.find("[name=" + name + "],.wui-subobj-" + name): this;
	return WUI.getFormItem(ji);
}

/*
// 倒序遍历对象obj, 用法与$.each相同。
function eachR(obj, cb)
{
	var arr = [];
	for (var prop in obj) {
		arr.push(prop);
	}
	for (var i=arr.length-1; i>=0; --i) {
		var v = obj[arr[i]];
		if (cb.call(v, arr[i], v) === false)
			break;
	}
}
*/

function formItems(jo, cb, sel)
{
	if (sel == null)
		sel = "[name]";
	var jiList = jo.filter(sel).add(jo.find(sel));
	jiList.each (function () {
		var it = getFormItem($(this));
		var name = it.getName();
		if (! name)
			return;
		var ji = it.getJo(); // 原jquery对象, 一般与$(this)相同，但像combo这类可能不同
		if (cb(ji, name, it) === false) {
			return false;
		}
	});
}

/**
@fn setFormData(jo, data?, opt?)

用于为带name属性的DOM对象设置内容为data[name].
要清空所有内容, 可以用 setFormData(jo), 相当于增强版的 form.reset().

注意:
- DOM项的内容指: 如果是input/textarea/select等对象, 内容为其value值; 如果是div组件, 内容为其innerHTML值.
- 当data[name]未设置(即值为undefined, 注意不是null)时, 对于input/textarea等组件, 行为与form.reset()逻辑相同, 
 即恢复为初始化值。（特别地，form.reset无法清除input[type=hidden]对象的内容, 而setFormData可以)
 对div等其它对象, 会清空该对象的内容.
- 如果对象设置有属性"noReset", 则不会对它进行设置.

@param opt {setOrigin?=false, setOnlyDefined?=false}

@param opt.setOrigin 为true时将data设置为数据源, 这样在getFormData时, 只会返回与数据源相比有变化的数据.
缺省会设置该DOM对象数据源为空.

@param opt.setOnlyDefined 设置为true时，只设置form中name在data中存在的项，其它项保持不变；而默认是其它项会清空。

对象关联的数据源, 可以通过 jo.data("origin_") 来获取, 或通过 jo.data("origin_", newOrigin) 来设置.

示例：

	<div id="div1">
		<p>订单描述：<span name="dscr"></span></p>
		<p>状态为：<input type=text name="status"></p>
		<p>金额：<span name="amount"></span>元</p>
	</div>

Javascript:

	var data = {
		dscr: "筋斗云教程",
		status: "已付款",
		amount: "100"
	};
	var jo = $("#div1");
	var data = setFormData(jo, data); 
	$("[name=status]").html("已完成");
	var changedData = getFormData(jo); // 返回 { dscr: "筋斗云教程", status: "已完成", amount: "100" }

	var data = setFormData(jo, data, {setOrigin: true}); 
	$("[name=status]").html("已完成");
	var changedData = getFormData(jo); // 返回 { status: "已完成" }
	$.extend(jo.data("origin_"), changedData); // 合并变化的部分到数据源.

@see getFormData
 */
self.setFormData = setFormData;
function setFormData(jo, data, opt)
{
	var opt1 = $.extend({
		setOrigin: false
	}, opt);
	if (data == null)
		data = {};
	formItems(jo, function (ji, name, it) {
		if (ji.attr("noReset"))
			return;
		var content = data[name];
		if (opt1.setOnlyDefined && content === undefined)
			return;
		it.setValue(content);
	});
	jo.data("origin_", opt1.setOrigin? data: null);
}

/**
@fn loadScript(url, fnOK?, ajaxOpt?)

@param fnOK 加载成功后的回调函数
@param ajaxOpt 传递给$.ajax的额外选项。

默认未指定ajaxOpt时，简单地使用添加script标签机制异步加载。如果曾经加载过，可以重用cache。

注意：再次调用时是否可以从cache中取，是由服务器的cache-control决定的，在web和web/page目录下的js文件一般是禁止缓存的，再次调用时会从服务器再取，若文件无更改，服务器会返回304状态。
这是因为默认我们使用Apache做服务器，在相应目录下.htaccess中配置有缓存策略。

如果指定ajaxOpt，且非跨域，则通过ajax去加载，可以支持同步调用。如果是跨域，仍通过script标签方式加载，注意加载完成后会自动删除script标签。

返回defered对象(与$.ajax类似)，可以用 dfd.then() / dfd.fail() 异步处理。

常见用法：

- 动态加载一个script，异步执行其中内容：

		loadScript("1.js", onload); // onload中可使用1.js中定义的内容
		loadScript("http://otherserver/path/1.js"); // 跨域加载

- 加载并立即执行一个script:

		loadScript("1.js", {async: false});
		// 可立即使用1.js中定义的内容
	
	注意：如果是跨域加载，不支持同步调用（$.ajax的限制），如：

		loadScript("http://oliveche.com/1.js", {async: false});
		// 一旦跨域，选项{async:false}指定无效，不可立即使用1.js中定义的内容。

示例：在菜单中加一项“工单工时统计”，动态加载并执行一个JS文件：
store.html中设置菜单：

				<a href="javascript:WUI.loadScript('page/mod_工单工时统计.js')">工单工时统计</a>
	
在`page/mod_工单工时统计.js`文件中写报表逻辑，`mod`表示一个JS模块文件，示例：

	function show工单工时统计()
	{
		DlgReportCond.show(function (data) {
			var queryParams = WUI.getQueryParam({createTm: [data.tm1, data.tm2]});
			var url = WUI.makeUrl("Ordr.query", { res: 'id 工单号, code 工单码, createTm 生产日期, itemCode 产品编码, itemName 产品名称, cate2Name 产品系列, itemCate 产品型号, qty 数量, mh 理论工时, mh1 实际工时', pagesz: -1 });
			WUI.showPage("pageSimple", "工单工时统计!", [url, queryParams, onInitGrid]);
		});
	}
	show工单工时统计();

如果JS文件修改了，点菜单时可以实时执行最新的内容。

如果要动态加载script，且使用后删除标签（里面定义的函数会仍然保留），建议直接使用`$.getScript`，它等同于：

	loadScript("1.js", {cache: false});

**[小技巧]**

在index.js/app.js等文件中写代码，必须刷新整个页面才能加载生效。
可以先把代码写在比如 web/test.js 中，这样每次修改后不用大刷新，直接在chrome控制台上加载运行：

	WUI.loadScript("test.js")

等改好了再拷贝到真正想放置这块代码的地方。修改已有的框架中函数也可以这样来快速迭代。
*/
self.loadScript = loadScript;
function loadScript(url, fnOK, options)
{
	if ($.isPlainObject(fnOK)) {
		options = fnOK;
		fnOK = null;
	}
	if (options) {
		var ajaxOpt = $.extend({
			dataType: "script",
			cache: true,
			success: fnOK,
			url: url,
			error: function (xhr, textStatus, err) {
				console.error("*** loadScript fails for " + url);
				console.error(err);
			}
		}, options);

		return jQuery.ajax(ajaxOpt);
	}

	var dfd_ = $.Deferred();
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= url;
	script.async = false; // 用于确保执行的先后顺序. 动态创建的script其async值默认为true（因而可能后加载的先执行导致错误），而直接写页面里的script标签默认async为false. 注意该属性与异步加载文件无关，加载都是异步的。
	script.onload = function () {
		if (fnOK)
			fnOK();
		dfd_.resolve();
	}
	script.onerror = function () {
		dfd_.reject();
		console.error("*** loadScript fails for " + url);
	}
	document.head.appendChild(script);
	return dfd_;
}

/**
@fn evalOptions(_source, ctx?, errPrompt?)

执行JS代码，返回JS对象，示例：

	source='{a: 1, b:"hello", c: function () {} }'
	前面允许有单行注释，如
	source='// comment\n {a: 1, b:"hello", c: function () {} }'

JS代码一般以花括号开头。在用于DOM属性时，也允许没有花括号的这种写法，如：

	<div data-options="a:1,b:'hello',c:true"></div>

上例可返回 `{a:1, b:'hello', c:true}`.

也支持各种表达式及函数调用，如：

	<div data-options="getSomeOption()"></div>

更复杂的，如果代码不只是一个选项，前面还有其它JS语句，则返回最后一行语句的值，
最后一行可以是变量、常量、函数调用等，但不可以是花括号开头的选项，对选项须用括号包起来：

	function hello() { }
	({a: 1, b:"hello", c: hello })

或：

	function hello() { }
	var ret={a: 1, b:"hello", c: hello }
	ret

传入的参数变量ctx可以在代码中使用，用于框架与扩展代码的交互，如：

	{a: 1, b:"hello", c: ctx.fn1() }

执行出错时错误显示在控制台。调用者可回调处理错误。

	evalOptions(src, null, function (ex) {
		app_alert("文件" + url + "出错: " + ex);
	});

注意：受限于浏览器，若使用`try { eval(str) } catch(ex) {}` 结构会导致原始的错误行号丢失，
为了避免大量代码中有错误时调试困难，在大于1行代码时，不使用try-catch，而是直接抛出错误。
 */
self.evalOptions = evalOptions;
function evalOptions(_source, ctx, onError)
{
	// "a:1, b:'hello'"
	if (/^\w+:/.test(_source)) {
		_source = "({" + _source + "})";
	}
	// "{a:1, b:'hello'}" 且前面可以有单行注释
	else if (/^(\s*\/\/[^\n]*\n)*\s*\{/.test(_source)) {
		_source = "(" + _source + ")";
	}
	if (_source.indexOf("\n") > 0)
		return eval(_source);

	try {
		return eval(_source);
	}
	catch (ex) {
		console.error(ex);
		if (onError) {
			onError(ex);
		}
		else {
			app_alert("代码错误: " + ex, "e");
		}
	}
}

/**
@fn loadJson(url, fnOK, options)

从远程获取JSON结果. 
注意: 与$.getJSON不同, 本函数不直接调用JSON.parse解析结果, 而是将返回当成JS代码使用eval执行得到JSON结果再回调fnOK.

示例:

	WUI.loadJson("1.js", function (data) {
		// handle json value `data`
	});

1.js可以是返回任意JS对象的代码, 如:

	{
		a: 2 * 3600,
		b: "hello",
		// c: {}
	}

如果不处理结果, 则该函数与$.getScript效果类似.

@see evalOptions
 */
self.loadJson = loadJson;
function loadJson(url, fnOK, options)
{
	var ajaxOpt = $.extend({
		dataType: "text",
		jdFilter: false,
		success: function (data) {
			val = self.evalOptions(data, null, function (ex) {
				app_alert("文件" + url + "出错: " + ex, "e");
			});
			fnOK.call(this, val);
		}
	}, options);
	return $.ajax(url, ajaxOpt);
}

/**
@fn loadCss(url)

动态加载css文件, 示例:

	WUI.loadCss("lib/bootstrap.min.css");

 */
self.loadCss = loadCss;
function loadCss(url)
{
	var jo = $('<link type="text/css" rel="stylesheet" />').attr("href", url);
	jo.appendTo($("head"));
}

/**
@fn setDateBox(jo, defDateFn?)

设置日期框, 如果输入了非法日期, 自动以指定日期(如未指定, 用当前日期)填充.

	setDateBox($("#txtComeDt"), function () { return genDefVal()[0]; });

 */
self.setDateBox = setDateBox;
function setDateBox(jo, defDateFn)
{
	jo.blur(function () {
		var dt = self.parseDate(this.value);
		if (dt == null) {
			if (defDateFn)
				dt = defDateFn();
			else
				dt = new Date();
		}
		this.value = dt.format("D");
	});
}

/**
@fn setTimeBox(jo, defTimeFn?)

设置时间框, 如果输入了非法时间, 自动以指定时间(如未指定, 用当前时间)填充.

	setTimeBox($("#txtComeTime"), function () { return genDefVal()[1]; });

 */
self.setTimeBox = setTimeBox;
function setTimeBox(jo, defTimeFn)
{
	jo.blur(function () {
		var dt = self.parseTime(this.value);
		if (dt == null) {
			if (defTimeFn)
				dt = defTimeFn();
			else
				dt = new Date();
		}
		this.value = dt.format("HH:MM");
	});
}

/**
@fn waitFor(deferredObj)

用于简化异步编程. 可将不易读的回调方式改写为易读的顺序执行方式.

	var dfd = $.getScript("http://...");
	function onSubmit()
	{
		dfd.then(function () {
			foo();
			bar();
		});
	}

可改写为:

	function onSubmit()
	{
		if (waitFor(dfd)) return;
		foo();
		bar();
	}

*/
self.waitFor = waitFor;
function waitFor(dfd)
{
	if (waitFor.caller == null)
		throw "waitFor MUST be called in function!";

	if (dfd.state() == "resolved")
		return false;

	if (!dfd.isset_)
	{
		var caller = waitFor.caller;
		var args = caller.arguments;
		dfd.isset_ = true;
		dfd.then(function () { caller.apply(this, args); });
	}
	return true;
}

/**
@fn rgb(r,g,b)

生成"#112233"形式的颜色值.

	rgb(255,255,255) -> "#ffffff"

 */
self.rgb = rgb;
function rgb(r,g,b,a)
{
	if (a === 0) // transparent (alpha=0)
		return;
	return '#' + pad16(r) + pad16(g) + pad16(b);

	function pad16(n) {
		var ret = n.toString(16);
		return n>16? ret: '0'+ret;
	}
}

/**
@fn rgb2hex(rgb)

将jquery取到的颜色转成16进制形式，如："rgb(4, 190, 2)" -> "#04be02"

示例：

	var color = rgb2hex( $(".mui-container").css("backgroundColor") );

 */
self.rgb2hex = rgb2hex;
function rgb2hex(rgbFormat)
{
	var rgba = rgb; // function rgb or rgba
	try {
		return eval(rgbFormat);
	} catch (ex) {
		console.log(ex);
	}
/*
	var ms = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	if (ms == null)
		return;
	var hex = "#";
	for (var i = 1; i <= 3; ++i) {
		var s = parseInt(ms[i]).toString(16);
		if (s.length == 1) {
			hex += "0" + s;
		}
		else {
			hex += s;
		}
	}
	return hex;
*/
}

/**
@fn jQuery.fn.jdata(val?)

和使用$.data()差不多，更好用一些. 例：

	$(o).jdata().hello = 100;
	$(o).jdata({hello:100, world:200});

*/
$.fn.jdata = function (val) {
	if (val != null) {
		this.data("jdata", val);
		return val;
	}
	var jd = this.data("jdata");
	if (jd == null)
		jd = this.jdata({});
	return jd;
}

/**
@fn compressImg(img, cb, opt)

通过限定图片大小来压缩图片，用于图片预览和上传。
不支持IE8及以下版本。

- img: Image对象
- cb: Function(picData) 回调函数
- opt: {quality=0.8, maxSize=1280, mimeType?="image/jpeg"}
- opt.maxSize: 压缩完后宽、高不超过该值。为0表示不压缩。
- opt.quality: 0.0-1.0之间的数字。
- opt.mimeType: 输出MIME格式。

函数cb的回调参数: picData={b64src,blob,w,h,w0,h0,quality,name,mimeType,size0,size,b64size,info}

b64src为base64格式的Data URL, 如 "data:image/jpeg;base64,/9j/4AAQSk...", 用于给image或background-image赋值显示图片；

可以赋值给Image.src:

	var img = new Image();
	img.src = picData.b64src;

或

	$("<div>").css("background-image", "url(" + picData.b64src + ")");

blob用于放到FormData中上传：

	fd.append('file', picData.blob, picData.name);

其它picData属性：

- w0,h0,size0分别为原图宽、高、大小; w,h,size为压缩后图片的宽、高、大小。
- quality: jpeg压缩质量,0-1之间。
- mimeType: 输出的图片格式
- info: 提示信息，会在console中显示。用于调试。

**[预览和上传示例]**

HTML:

	<form action="upfile.php">
		<div class="img-preview"></div>
		<input type="file" /><br/>
		<input type="submit" >
	</form>

用picData.b64src来显示预览图，并将picData保存在img.picData_属性中，供后面上传用。

	var jfrm = $("form");
	var jpreview = jfrm.find(".img-preview");
	var opt = {maxSize:1280};
	jfrm.find("input[type=file]").change(function (ev) {
		$.each(this.files, function (i, fileObj) {
			compressImg(fileObj, function (picData) {
				$("<img>").attr("src", picData.b64src)
					.prop("picData_", picData)
					.appendTo(jpreview);
				//$("<div>").css("background-image", "url("+picData.b64src+")").appendTo(jpreview);
			}, opt);
		});
		this.value = "";
	});

上传picData.blob到服务器

	jfrm.submit(function (ev) {
		ev.preventDefault();

		var fd = new FormData();
		var idx = 1;
		jpreview.find("img").each(function () {
			// 名字要不一样，否则可能会覆盖
			fd.append('file' + idx, this.picData_.blob, this.picData_.name);
			++idx;
		});
	 
		$.ajax({
			url: jfrm.attr("action"),
			data: fd,
			processData: false,
			contentType: false,
			type: 'POST',
			// 允许跨域调用
			xhrFields: {
				withCredentials: true
			},
			success: cb
		});
		return false;
	});

参考：JIC.js (https://github.com/brunobar79/J-I-C)

TODO: 用完后及时释放内存，如调用revokeObjectURL等。
 */
self.compressImg = compressImg;
function compressImg(fileObj, cb, opt)
{
	var opt0 = {
		quality: 0.8,
		maxSize: 1280,
		mimeType: "image/jpeg"
	};
	opt = $.extend(opt0, opt);

	// 部分旧浏览器使用BlobBuilder的（如android-6.0, mate7自带浏览器）, 压缩率很差。不如直接上传。而且似乎是2M左右文件浏览器无法上传，导致服务器收不到。
	window.BlobBuilder = (window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder);
 	var doDowngrade = !window.Blob 
			|| window.BlobBuilder;
	if (doDowngrade) {
		var rv = {
			name: fileObj.name,
			size: fileObj.size,
			b64src: window.URL.createObjectURL(fileObj),
			blob: fileObj,
		};
		rv.info = "compress ignored. " + rv.name + ": " + (rv.size/1024).toFixed(0) + "KB";
		console.log(rv.info);
		cb(rv);
		return;
	}

	var img = new Image();
	// 火狐7以下版本要用 img.src = fileObj.getAsDataURL();
	img.src = window.URL.createObjectURL(fileObj);
	img.onload = function () {
		var rv = resizeImg(img);
		rv.info = "compress " + rv.name + " q=" + rv.quality + ": " + rv.w0 + "x" + rv.h0 + "->" + rv.w + "x" + rv.h + ", " + (rv.size0/1024).toFixed(0) + "KB->" + (rv.size/1024).toFixed(0) + "KB(rate=" + (rv.size / rv.size0 * 100).toFixed(2) + "%,b64=" + (rv.b64size/1024).toFixed(0) + "KB)";
		console.log(rv.info);
		cb(rv);
	}

	// return: {w, h, quality, size, b64src}
	function resizeImg()
	{
		var w = img.naturalWidth, h = img.naturalHeight;
		if (opt.maxSize<w || opt.maxSize<h) {
			if (w > h) {
				h = Math.round(h * opt.maxSize / w);
				w = opt.maxSize;
			}
			else {
				w = Math.round(w * opt.maxSize / h);
				h = opt.maxSize;
			}
		}

		var cvs = document.createElement('canvas');
		cvs.width = w;
		cvs.height = h;

		var ctx = cvs.getContext("2d").drawImage(img, 0, 0, w, h);
		var b64src = cvs.toDataURL(opt.mimeType, opt.quality);
		var blob = getBlob(b64src);
		// 无压缩效果，则直接用原图
		if (blob.size > fileObj.size) {
			blob = fileObj;
			// b64src = img.src;
			opt.mimeType = fileObj.type;
		}
		// 如果没有扩展名或文件类型发生变化，自动更改扩展名
		var fname = getFname(fileObj.name, opt.mimeType);
		return {
			w0: img.naturalWidth,
			h0: img.naturalHeight,
			w: w,
			h: h,
			quality: opt.quality,
			mimeType: opt.mimeType,
			b64src: b64src,
			name: fname,
			blob: blob,
			size0: fileObj.size,
			b64size: b64src.length,
			size: blob.size
		};
	}

	function getBlob(b64src) 
	{
		var bytes = window.atob(b64src.split(',')[1]); // "data:image/jpeg;base64,{b64data}"
		//var ab = new ArrayBuffer(bytes.length);
		var ia = new Uint8Array(bytes.length);
		for(var i = 0; i < bytes.length; i++){
			ia[i] = bytes.charCodeAt(i);
		}
		var blob;
		try {
			blob = new Blob([ia.buffer], {type: opt.mimeType});
		}
		catch(e){
			// TypeError old chrome and FF
			if (e.name == 'TypeError' && window.BlobBuilder){
				var bb = new BlobBuilder();
				bb.append(ia.buffer);
				blob = bb.getBlob(opt.mimeType);
			}
			else{
				// We're screwed, blob constructor unsupported entirely   
			}
		}
		return blob;
	}

	function getFname(fname, mimeType)
	{
		var exts = {
			"image/jpeg": ".jpg",
			"image/png": ".png",
			"image/webp": ".webp"
		};
		var ext1 = exts[mimeType];
		if (ext1 == null)
			return fname;
		return fname.replace(/(\.\w+)?$/, ext1);
	}
}

/**
@fn triggerAsync(jo, ev, paramArr)

触发含有异步操作的事件，在异步事件完成后继续。兼容同步事件处理函数，或多个处理函数中既有同步又有异步。
返回Deferred对象，或false表示要求取消之后操作。

@param ev 事件名，或事件对象$.Event()

示例：以事件触发方式调用jo的异步方法submit:

	var dfd = WUI.triggerAsync(jo, 'submit');
	if (dfd === false)
		return;
	dfd.then(doNext);

	function doNext() { }

jQuery对象这样提供异步方法：triggerAsync会用事件对象ev创建一个dfds数组，将Deferred对象存入即可支持异步调用。

	jo.on('submit', function (ev) {
		var dfd = $.ajax("upload", ...);
		if (ev.dfds)
			ev.dfds.push(dfd);
	});

*/
self.triggerAsync = triggerAsync;
function triggerAsync(jo, ev, paramArr)
{
	if (typeof(ev) == "string") {
		ev = $.Event(ev);
	}
	ev.dfds = [];
	jo.trigger(ev, paramArr);
	if (ev.isDefaultPrevented())
		return false;
	return $.when.apply(this, ev.dfds);
}

/**
@fn $.Deferred
@alias Promise
兼容Promise的接口，如then/catch/finally
 */
var fnDeferred = $.Deferred;
$.Deferred = function () {
	var ret = fnDeferred.apply(this, arguments);
	ret.catch = ret.fail;
	ret.finally = ret.always;
	var fn = ret.promise;
	ret.promise = function () {
		var r = fn.apply(this, arguments);
		r.catch = r.fail;
		r.finally = r.always;
		return r;
	}
	return ret;
}

// 返回筋斗云后端query接口可接受的cond条件。可能会修改cond(如果它是数组)
function appendCond(cond, cond1)
{
	if (!cond) {
		if ($.isArray(cond1))
			return $.extend(true, [], cond1);
		if ($.isPlainObject(cond1))
			return $.extend(true, {}, cond1);
		return cond1;
	}
	if (!cond1)
		return cond;

	if ($.isArray(cond)) {
		cond.push(cond1);
	}
	else if (typeof(cond) == "string" && typeof(cond1) == "string") {
		cond += " AND (" + cond1 + ")";
	}
	else {
		cond = [cond, cond1];
	}
	return cond;
}

// 类似$.extend，但对cond做合并而不是覆盖处理. 将修改并返回target
self.extendQueryParam = extendQueryParam;
function extendQueryParam(target, a, b)
{
	var cond;
	$.each(arguments, function (i, e) {
		if (i == 0) {
			cond = target.cond;
		}
		else if ($.isPlainObject(e)) {
			cond = appendCond(cond, e.cond);
			$.extend(target, e);
		}
	});
	if (cond) {
		target.cond = cond;
	}
	return target;
}

/**
@fn makeTree(arr, idField="id", fatherIdField="fatherId", childrenField="children")

将array转成tree. 注意它会修改arr（添加children属性），但返回新的数组。

	var ret = WUI.makeTree([
		{id: 1},
		{id: 2, fatherId: 1},
		{id: 3, fatherId: 2},
		{id: 4, fatherId: 1}
	]);

结果：

	ret = [
		{id: 1, children:  [
			{id: 2, fatherId: 1, children:  [
				{id: 3, fatherId: 2},
			],
			{id: 4, fatherId: 1}
		]
	]
 */
self.makeTree = makeTree;
function makeTree(arr, idField, fatherIdField, childrenField)
{
	if (idField == null)
		idField = "id";
	if (fatherIdField == null)
		fatherIdField = "fatherId";
	if (childrenField == null)
		childrenField = "children";
	var ret = [];
	$.each(arr, function (i, e) {
		var fid = e[fatherIdField];
		if (fid == null) {
			ret.push(e);
			return;
		}
		var found = false;
		$.each(arr, function (i1, e1) {
			if (fid == e1[idField]) {
				if (e1[childrenField] == null) {
					e1[childrenField] = [];
				}
				e1[childrenField].push(e);
				found = true;
				return false;
			}
		});
		if (! found)
			ret.push(e);
	});
	return ret;
}

}
// ====== WEBCC_END_FILE commonjq.js }}}

// ====== WEBCC_BEGIN_FILE app.js {{{
function JdcloudApp()
{
var self = this;
self.ctx = self.ctx || {};

window.E_AUTHFAIL=-1;
window.E_NOAUTH=2;
window.E_ABORT=-100;

/**
@fn evalAttr(jo, name)

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
@fn setOnError()

一般框架自动设置onerror函数；如果onerror被其它库改写，应再次调用该函数。
allow throw("abort") as abort behavior.
 */
self.setOnError = setOnError;
function setOnError()
{
	var fn = window.onerror;
	window.onerror = function (msg, script, line, col, errObj) {
		// 出错后尝试恢复callSvr变量
		if ($.active || self.isBusy) {
			setTimeout(function () {
				$.active = 0;
				self.isBusy = 0;
				self.hideLoading();
			}, 1000);
		}
		if (fn && fn.apply(this, arguments) === true)
			return true;
		if (errObj instanceof DirectReturn || /abort$/.test(msg))
			return true;
		if (self.options.skipErrorRegex && self.options.skipErrorRegex.test(msg))
			return true;
		if (errObj === undefined && msg === "[object Object]") // fix for IOS9
			return true;
		debugger;
		var content = msg + " (" + script + ":" + line + ":" + col + ")";
		if (errObj && errObj.stack)
			content += "\n" + errObj.stack.toString();
		if (self.syslog)
			self.syslog("fw", "ERR", content);
		app_alert(msg, "e");
	}
}
setOnError();

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
@fn getOptions(jo, defVal?)

第一次调用，根据jo上设置的data-options属性及指定的defVal初始化，或为`{}`。
存到jo.prop("muiOptions")上。之后调用，直接返回该属性。

@see evalAttr
*/
self.getOptions = getOptions;
function getOptions(jo, defVal)
{
	var opt = jo.prop("muiOptions");
	if (opt === undefined) {
		opt = $.extend({}, defVal, self.evalAttr(jo, "data-options"));
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
	var is_like=false;
	var ms;
	if (ms=v.match(/^(<>|>=?|<=?|!=?)/)) {
		op = ms[1];
		v = v.substr(op.length);
		if (op == "!" || op == "!=")
			op = "<>";
	}
	else if (v.indexOf("*") >= 0 || v.indexOf("%") >= 0) {
		v = v.replace(/[*]/g, "%");
		op = " LIKE ";
	}
	v = $.trim(v);

	if (v === "null")
	{
		if (op == "<>")
			return k + " is not null";
		return k + " is null";
	}
	if (v === "empty")
		v = "";

	var isId = (k=="id" || k.substr(-2)=="Id");
	if (isId && v.match(/^\d+$/))
		return k + op + v;
	var doFuzzy = self.options.fuzzyMatch && op == "=" && !(hint == "e"); // except enum
	if (doFuzzy) {
		op = " LIKE ";
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

(v5.5) value支持用数组表示范围（前闭后开区间），主要内部使用：

	var cond = getQueryCond({tm: ["2019-1-1", "2020-1-1"]}); // 生成 "tm>='2019-1-1' AND tm<'2020-1-1'"
	var cond = getQueryCond({tm: [null, "2020-1-1"]}); // 生成 "tm<'2020-1-1'"
	var cond = getQueryCond({tm: [null, null]); // 返回null

@see getQueryParam
@see getQueryParamFromTable 获取datagrid的当前查询参数
@see doFind

(v5.5) 支持在key中包含查询提示。如"code/s"表示不要自动猜测数值区间或日期区间。
比如输入'126231-191024'时不会当作查询126231到191024的区间。

(v6) 日期、时间字段查询时，可使用`WUI.getTmRange`函数支持的时间区间如"今天"，"本周"，"本月", "今年", "近3天(小时|周|月|季度|年)”，"前3天(小时|周|月|季度|年)”等。

@see wui-find-hint
*/
self.queryHint = "查询示例\n" +
	"文本：\"王小明\", \"王*\"(匹配开头), \"*上海*\"(匹配部分)\n" +
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
// ====== WEBCC_END_FILE app.js }}}

// ====== WEBCC_BEGIN_FILE callSvr.js {{{
function JdcloudCall()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

/**
@var lastError = ctx

出错时，取出错调用的上下文信息。

ctx: {ac, tm, tv, ret}

- ac: action 调用接口名
- tm: start time 开始调用时间
- tv: time interval 从调用到返回的耗时
- ret: return value 调用返回的原始数据
*/
self.lastError = null;
var m_tmBusy;
var m_manualBusy = 0;
var m_appVer;
var m_silentCall = 0;

/**
@var disableBatch ?= false

设置为true禁用batchCall, 仅用于内部测试。
*/
self.disableBatch = false;

/**
@var m_curBatch

当前batchCall对象，用于内部调试。
*/
var m_curBatch = null;
self.m_curBatch = m_curBatch;

var RV_ABORT = undefined;//"$abort$";

/**
@var mockData  模拟调用后端接口。

在后端接口尚无法调用时，可以配置MUI.mockData做为模拟接口返回数据。
调用callSvr时，会直接使用该数据，不会发起ajax请求。

mockData={ac => data/fn}  

mockData中每项可以直接是数据，也可以是一个函数：fn(param, postParam)->data

例：模拟"User.get(id)"和"User.set()(key=value)"接口：

	var user = {
		id: 1001,
		name: "孙悟空",
	};
	MUI.mockData = {
		// 方式1：直接指定返回数据
		"User.get": [0, user],

		// 方式2：通过函数返回模拟数据
		"User.set": function (param, postParam) {
			$.extend(user, postParam);
			return [0, "OK"];
		}
	}

	// 接口调用：
	var user = callSvrSync("User.get");
	callSvr("User.set", {id: user.id}, function () {
		alert("修改成功！");
	}, {name: "大圣"});

实例详见文件 mockdata.js。

在mockData的函数中，可以用this变量来取ajax调用参数。
要取HTTP动词可以用`this.type`，值为GET/POST/PATCH/DELETE之一，从而可模拟RESTful API.

可以通过MUI.options.mockDelay设置模拟调用接口的网络延时。
@see options.mockDelay

模拟数据可直接返回[code, data]格式的JSON数组，框架会将其序列化成JSON字符串，以模拟实际场景。
如果要查看调用与返回数据日志，可在浏览器控制台中设置 MUI.options.logAction=true，在控制台中查看日志。

如果设置了MUI.callSvrExt，调用名(ac)中应包含扩展(ext)的名字，例：

	MUI.callSvrExt['zhanda'] = {...};
	callSvr(['token/get-token', 'zhanda'], ...);

要模拟该接口，应设置

	MUI.mockData["zhanda:token/get-token"] = ...;

@see callSvrExt

也支持"default"扩展，如：

	MUI.callSvrExt['default'] = {...};
	callSvr(['token/get-token', 'default'], ...);
	或
	callSvr('token/get-token', ...);

要模拟该接口，可设置

	MUI.mockData["token/get-token"] = ...;

*/
self.mockData = {};

/**
@key $.ajax
@key ajaxOpt.jdFilter 禁用返回格式合规检查.

以下调用, 如果1.json符合`[code, data]`格式, 则只返回处理data部分; 否则将报协议格式错误:

	$.ajax("1.json", {dataType: "json"})
	$.get("1.json", null, console.log, "json")
	$.getJSON("1.json", null, console.log)

对于ajax调用($.ajax,$.get,$.post,$.getJSON等), 若明确指定dataType为"json"或"text", 且未指定jdFilter为false, 
则框架按筋斗云返回格式即`[code, data]`来处理只返回data部分, 不符合该格式, 则报协议格式错误.

以下调用未指定dataType, 或指定了jdFilter=false, 则不会应用筋斗云协议格式:

	$.ajax("1.json")
	$.get("1.json", null, console.log)
	$.ajax("1.json", {jdFilter: false}) // jdFilter选项明确指定了不应用筋斗云协议格式

*/
var ajaxOpt = {
	beforeSend: function (xhr) {
		// 保存xhr供dataFilter等函数内使用。
		this.xhr_ = xhr;
		var type = this.dataType;
		if (this.jdFilter !== false && (type == "json" || type == "text")) {
			this.jdFilter = true;
			// for jquery > 1.4.2. don't convert text to json as it's processed by defDataProc.
			// NOTE: 若指定dataType为"json"时, jquery会对dataFilter处理过的结果再进行JSON.parse导致出错, 根据jquery1.11源码修改如下:
			this.converters["text json"] = true;
		}
	},
	//dataType: "text",
	dataFilter: function (data, type) {
		if (this.jdFilter) {
			rv = defDataProc.call(this, data);
			if (rv !== RV_ABORT)
				return rv;
			-- $.active; // ajax调用中断,这里应做些清理
			self.app_abort();
		}
		return data;
	},

	error: defAjaxErrProc
};
if (location.protocol == "file:") {
	ajaxOpt.xhrFields = { withCredentials: true};
}
$.ajaxSetup(ajaxOpt);

/**
@fn enterWaiting(ctx?)
@param ctx {ac, tm, tv?, tv2?, noLoadingImg?}
*/
self.enterWaiting = enterWaiting;
function enterWaiting(ctx)
{
	if (ctx && ctx.noLoadingImg) {
		++ m_silentCall;
		return;
	}
	if (self.isBusy == 0) {
		m_tmBusy = new Date();
	}
	self.isBusy = 1;
	if (ctx == null || ctx.isMock)
		++ m_manualBusy;

	// 延迟执行以防止在page show时被自动隐藏
	//mCommon.delayDo(function () {
	setTimeout(function () {
		if (self.isBusy)
			self.showLoading();
	}, (self.options.showLoadingDelay || 200));
// 		if ($.mobile && !(ctx && ctx.noLoadingImg))
// 			$.mobile.loading("show");
	//},1);
}

/**
@fn leaveWaiting(ctx?)
*/
self.leaveWaiting = leaveWaiting;
function leaveWaiting(ctx)
{
	if (ctx == null || ctx.isMock)
	{
		if (-- m_manualBusy < 0)
			m_manualBusy = 0;
	}
	// 当无远程API调用或js调用时, 设置isBusy=0
	mCommon.delayDo(function () {
		if (self.options.logAction && ctx && ctx.ac && ctx.tv) {
			var tv2 = (new Date() - ctx.tm) - ctx.tv;
			ctx.tv2 = tv2;
			console.log(ctx);
		}
		if (ctx && ctx.noLoadingImg)
			-- m_silentCall;
		if ($.active < 0)
			$.active = 0;
		// 一直等到不忙，避免callSvr/$.ajax混用导致无法hideLoading
		// 注意：一旦在callSvc回调中异常出错，会在WUI.setOnError中处理($.active=0)，避免一直显示加载。
		loopDo(function () {
			if ($.active-m_silentCall > 0 || m_manualBusy != 0)
				return;
			if (self.isBusy) {
				self.isBusy = 0;
				var tv = new Date() - m_tmBusy;
				m_tmBusy = 0;
				console.log("idle after " + tv + "ms");

				// handle idle
				self.hideLoading();
				$(document).trigger("idle");
			}
// 			if ($.mobile)
// 				$.mobile.loading("hide");
			return true;
		});
	});
}

// fn()返回true时完成，否则反复执行
function loopDo(fn)
{
	if (fn())
		return;
	setTimeout(loopDo.bind(this, fn), 50);
}

function defAjaxErrProc(xhr, textStatus, e)
{
	//if (xhr && xhr.status != 200) {
		var ctx = this.ctx_ || {};
		ctx.status = xhr.status;
		ctx.statusText = xhr.statusText;

		if (xhr.status == 0 && !ctx.noex) {
			self.app_alert("连不上服务器了，是不是网络连接不给力？", "e");
		}
		else if (this.handleHttpError) {
			var data = xhr.responseText;
			var rv = defDataProc.call(this, data);
			if (rv !== RV_ABORT)
				this.success && this.success(rv);
			return;
		}
		else if (!ctx.noex) {
			self.app_alert("操作失败: 服务器错误. status=" + xhr.status + "-" + xhr.statusText, "e");
		}

		leaveWaiting(ctx);
	//}
}

/**
@fn defDataProc(rv)

@param rv BQP协议原始数据，如 "[0, {id: 1}]"，一般是字符串，也可以是JSON对象。
@return data 按接口定义返回的数据对象，如 {id: 1}. 如果返回值===RV_ABORT，调用函数应直接返回，不回调应用层。

注意：如果callSvr设置了`noex:1`选项，则当调用失败时返回false。

*/
self.defDataProc = defDataProc;
function defDataProc(rv)
{
	var ctx = this.ctx_ || {};
	var ext = ctx.ext;

	// ajax-beforeSend回调中设置
	if (this.xhr_ && (ext == null || ext == "default") ) {
		var val = this.xhr_.getResponseHeader("X-Daca-Server-Rev");
		if (val && g_data.serverRev != val) {
			if (g_data.serverRev) {
				mCommon.reloadSite();
			}
			console.log("Server Revision: " + val);
			g_data.serverRev = val;
		}
		var modeStr;
		val = mCommon.parseValue(this.xhr_.getResponseHeader("X-Daca-Test-Mode"));
		if (g_data.testMode != val) {
			g_data.testMode = val;
			if (g_data.testMode)
				modeStr = "测试模式";
		}
		val = mCommon.parseValue(this.xhr_.getResponseHeader("X-Daca-Mock-Mode"));
		if (g_data.mockMode != val) {
			g_data.mockMode = val;
			if (g_data.mockMode)
				modeStr = "测试模式+模拟模式";
		}
		if (modeStr) {
			self.dfdLogin.then(function () {
				self.app_alert(modeStr, {timeoutInterval:2000});
			});
		}
	}

	try {
		if (rv !== "" && typeof(rv) == "string")
			rv = $.parseJSON(rv);
	}
	catch (e)
	{
		leaveWaiting(ctx);
		var msg = "服务器数据错误。";
		self.app_alert(msg);
		ctx.dfd.reject.call(this, msg);
		return;
	}

	if (ctx.tm) {
		ctx.tv = new Date() - ctx.tm;
	}
	ctx.ret = rv;

	leaveWaiting(ctx);

	if (ext) {
		var filter = self.callSvrExt[ext] && self.callSvrExt[ext].dataFilter;
		if (filter) {
			var ret = filter.call(this, rv);
			if (ret == null || ret === false)
				self.lastError = ctx;
			return ret;
		}
	}

	if (rv && $.isArray(rv) && rv.length >= 2 && typeof rv[0] == "number") {
		var that = this;
		if (rv[0] == 0) {
			ctx.dfd && setTimeout(function () {
				ctx.dfd.resolve.call(that, rv[1]);
			});
			return rv[1];
		}
		ctx.dfd && setTimeout(function () {
			if (!that.noex)
				ctx.dfd.reject.call(that, rv[1]);
			else
				ctx.dfd.resolve.call(that, false);
		});

		if (this.noex)
		{
			this.lastError = rv;
			self.lastError = ctx;
			return false;
		}

		if (rv[0] == E_NOAUTH) {
			if (self.tryAutoLogin()) {
				$.ajax(this);
			}
// 				self.popPageStack(0);
// 				self.showLogin();
			return RV_ABORT;
		}
		else if (rv[0] == E_AUTHFAIL) {
			var errmsg = rv[1] || "验证失败，请检查输入是否正确!";
			self.app_alert(errmsg, "e");
			return RV_ABORT;
		}
		else if (rv[0] == E_ABORT) {
			console.log("!!! abort call");
			return RV_ABORT;
		}
		logError();
		self.app_alert("操作失败：" + rv[1], "e");
	}
	else {
		logError();
		self.app_alert("服务器通讯协议异常!", "e"); // 格式不对
	}
	return RV_ABORT;

	function logError()
	{
		self.lastError = ctx;
		console.log("failed call");
		console.log(ctx);
	}
}

/**
@fn getBaseUrl()

取服务端接口URL对应的目录。可用于拼接其它服务端资源。
相当于dirname(MUI.options.serverUrl);

例如：

serverUrl为"../jdcloud/api.php" 或 "../jdcloud/"，则MUI.baseUrl返回 "../jdcloud/"
serverUrl为"http://myserver/myapp/api.php" 或 "http://myserver/myapp/"，则MUI.baseUrl返回 "http://myserver/myapp/"
 */
self.getBaseUrl = getBaseUrl;
function getBaseUrl()
{
	return self.options.serverUrl.replace(/\/[^\/]+$/, '/');
}

/**
@fn makeUrl(action, params?)

生成对后端调用的url. 

	var params = {id: 100};
	var url = MUI.makeUrl("Ordr.set", params);

注意：函数返回的url是字符串包装对象，可能含有这些属性：{makeUrl=true, action?, params?}
这样可通过url.action得到原始的参数。

支持callSvr扩展，如：

	var url = MUI.makeUrl('zhanda:login');

(deprecated) 为兼容旧代码，action可以是一个数组，在WUI环境下表示对象调用:

	WUI.makeUrl(['Ordr', 'query']) 等价于 WUI.makeUrl('Ordr.query');

在MUI环境下表示callSvr扩展调用:

	MUI.makeUrl(['login', 'zhanda']) 等价于 MUI.makeUrl('zhanda:login');

特别地, 如果action是相对路径, 或是'.php'文件, 则不会自动拼接WUI.options.serverUrl:

	callSvr("./1.json"); // 如果是callSvr("1.json") 则url可能是 "../api.php/1.json"这样.
	callSvr("./1.php");

@see callSvrExt
 */
self.makeUrl = makeUrl;
function makeUrl(action, params)
{
	var ext;
	if ($.isArray(action)) {
		if (window.MUI) {
			ext = action[1];
			action = action[0];
		}
		else {
			ext = "default";
			action = action[0] + "." + action[1];
		}
	}
	else if (action) {
		var m = action.match(/^(\w+):(\w.*)/);
		if (m) {
			ext = m[1];
			action = m[2];
		}
		else {
			ext = "default";
		}
	}
	else {
		throw "makeUrl error: no action";
	}

	// 有makeUrl属性表示已调用过makeUrl
	if (action.makeUrl || /^http/.test(action)) {
		if (params == null)
			return action;
		if (action.makeUrl)
			return makeUrl(action.action, $.extend({}, action.params, params));
		var url = mCommon.appendParam(action, $.param(params));
		return makeUrlObj(url);
	}

	if (params == null)
		params = {};

	var url;
	var fnMakeUrl = self.callSvrExt[ext] && self.callSvrExt[ext].makeUrl;
	if (fnMakeUrl) {
		url = fnMakeUrl(action, params);
	}
	else if (self.options.moduleExt && (url = self.options.moduleExt["callSvr"](action)) != null) {
	}
	// 缺省接口调用：callSvr('login'),  callSvr('./1.json') 或 callSvr("1.php") (以"./"或"../"等相对路径开头, 或是取".php"文件, 则不去自动拼接serverUrl)
	else if (action[0] != '.' && action.indexOf(".php") < 0)
	{
		var opt = self.options;
		var usePathInfo = !opt.serverUrlAc;
		if (usePathInfo) {
			if (opt.serverUrl.slice(-1) == '/')
				url = opt.serverUrl + action;
			else
				url = opt.serverUrl + "/" + action;
		}
		else {
			url = opt.serverUrl;
			params[opt.serverUrlAc] = action;
		}
	}
	else {
		if (location.protocol == "file:") {
			url = getBaseUrl() + action;
		}
		else
			url = action;
	}
	if (window.g_cordova) {
		if (m_appVer === undefined)
		{
			var platform = "n";
			if (mCommon.isAndroid()) {
				platform = "a";
			}
			else if (mCommon.isIOS()) {
				platform = "i";
			}
			m_appVer = platform + "/" + g_cordova;
		}
		params._ver = m_appVer;
	}
	if (self.options.appName)
		params._app = self.options.appName;
	if (g_args._debug)
		params._debug = g_args._debug;
	if (g_args.phpdebug)
		params.XDEBUG_SESSION_START = 1;

	var ret = mCommon.appendParam(url, $.param(params));
	return makeUrlObj(ret);

	function makeUrlObj(url)
	{
		var o = new String(url);
		o.makeUrl = true;
		if (action.makeUrl) {
			o.action = action.action;
			o.params = $.extend({}, action.params, params);
		}
		else {
			o.action = action;
			o.params = params;
		}
		return o;
	}
}

/**
@fn callSvr(ac, [params?], fn?, postParams?, userOptions?) -> deferredObject

@param ac String. action, 交互接口名. 也可以是URL(比如由makeUrl生成)
@param params Object. URL参数（或称HTTP GET参数）
@param postParams Object. POST参数. 如果有该参数, 则自动使用HTTP POST请求(postParams作为POST内容), 否则使用HTTP GET请求.
@param fn Function(data). 回调函数, data参考该接口的返回值定义。
@param userOptions 用户自定义参数, 会合并到$.ajax调用的options参数中.可在回调函数中用"this.参数名"引用. 

常用userOptions: 

- 指定{async:0}来做同步请求, 一般直接用callSvrSync调用来替代.
- 指定{noex:1}用于忽略错误处理。
- 指定{noLoadingImg:1} 静默调用，忽略loading图标，不设置busy状态。

指定contentType和设置自定义HTTP头(headers)示例:

	var opt = {
		contentType: "text/xml",
		headers: {
			Authorization: "Basic aaa:bbb"
		}
	};
	callSvr("hello", $.noop, "<?xml version='1.0' encoding='UTF-8'?><return><code>0</code></return>", opt);

想为ajax选项设置缺省值，可以用callSvrExt中的beforeSend回调函数，也可以用$.ajaxSetup，
但要注意：ajax的dataFilter/beforeSend选项由于框架已用，最好不要覆盖。

@see callSvrExt[].beforeSend(opt) 为callSvr选项设置缺省值

@return deferred对象，在Ajax调用成功后回调。
例如，

	var dfd = callSvr(ac, fn1);
	dfd.then(fn2);

	function fn1(data) {}
	function fn2(data) {}

在接口调用成功后，会依次回调fn1, fn2. 在回调函数中this表示ajax参数。例如：

	callSvr(ac, function (data) {
		// 可以取到传入的参数。
		console.log(this.key1);
	}, null, {key1: 'val1'});

(v5.4) 支持失败时回调：

	var dfd = callSvr(ac);
	dfd.fail(function (data) {
		console.log('error', data);
		console.log(this.ctx_.ret); // 和设置选项{noex:1}时回调中取MUI.lastError.ret 或 this.lastError相同。
	});

@key callSvr.noex 调用接口时忽略出错，可由回调函数fn自己处理错误。

当后端返回错误时, 回调`fn(false)`（参数data=false）. 可通过 MUI.lastError.ret 或 this.lastError 取到返回的原始数据。

示例：

	callSvr("logout");
	callSvr("logout", api_logout);
	function api_logout(data) {}

	callSvr("login", api_login);
	function api_login(data) {}

	callSvr("info/hotline.php", {q: '大众'}, api_hotline);
	function api_hotline(data) {}

	// 也可使用makeUrl生成的URL如:
	callSvr(MUI.makeUrl("logout"), api_logout);
	callSvr(MUI.makeUrl("logout", {a:1}), api_logout);

	callSvr("User.get", function (data) {
		if (data === false) { // 仅当设置noex且服务端返回错误时可返回false
			// var originalData = MUI.lastError.ret; 或
			// var originalData = this.lastError;
			return;
		}
		foo(data);
	}, null, {noex:1});

@see lastError 出错时的上下文信息

## 调用监控

框架会自动在ajaxOption中增加ctx_属性，它包含 {ac, tm, tv, tv2, ret} 这些信息。
当设置MUI.options.logAction=1时，将输出这些信息。
- ac: action
- tm: start time
- tv: time interval (从发起请求到服务器返回数据完成的时间, 单位是毫秒)
- tv2: 从接到数据到完成处理的时间，毫秒(当并发处理多个调用时可能不精确)

## 文件上传支持(FormData)

callSvr支持FormData对象，可用于上传文件等场景。示例如下：

@key example-upload

HTML:

	file: <input id="file1" type="file" multiple>
	<button type="button" id="btn1">upload</button>

JS:

	jpage.find("#btn1").on('click', function () {
		var fd = new FormData();
		$.each(jpage.find('#file1')[0].files, function (i, e) {
			fd.append('file' + (i+1), e);
		});
		callSvr('upload', api_upload, fd);

		function api_upload(data) { ... }
	});

## callSvr扩展

@key callSvrExt

当调用第三方API时，也可以使用callSvr扩展来代替$.ajax调用以实现：
- 调用成功时直接可操作数据，不用每次检查返回码；
- 调用出错时可以统一处理。

例：合作方接口使用HTTP协议，格式如（以生成token调用为例）

	http://<Host IP Address>:<Host Port>/lcapi/token/get-token?user=用户名&password=密码

返回格式为：{code, msg, data}

成功返回：

	{
		"code":"0",
		"msg":"success",
		"data":[ { "token":"xxxxxxxxxxxxxx" } ]
	}

失败返回：

	{
		"code":"4001",
		"msg":"invalid username or password",
		"data":[]
	}

callSvr扩展示例：

	MUI.callSvrExt['zhanda'] = {
		makeUrl: function(ac, param) {
			// 只需要返回接口url即可，不必拼接param
			return 'http://hostname/lcapi/' + ac;
		},
		dataFilter: function (data) {
			if ($.isPlainObject(data) && data.code !== undefined) {
				if (data.code == 0)
					return data.data;
				if (this.noex)
					return false;
				app_alert("操作失败：" + data.msg, "e");
			}
			else {
				app_alert("服务器通讯协议异常!", "e"); // 格式不对
			}
		}
	};

在调用时，ac参数使用"{扩展名}:{调用名}"的格式：

	callSvr('zhanda:token/get-token', {user: 'test', password: 'test123'}, function (data) {
		console.log(data);
	});

旧的调用方式ac参数使用数组，现在已不建议使用：

	callSvr(['token/get-token', 'zhanda'], ...);

@key callSvrExt[].makeUrl(ac, param)

根据调用名ac生成url, 注意无需将param放到url中。

注意：
对方接口应允许JS跨域调用，或调用方支持跨域调用。

@key callSvrExt[].dataFilter(data) = null/false/data

对调用返回数据进行通用处理。返回值决定是否调用callSvr的回调函数以及参数值。

	callSvr(ac, callback);

- 返回data: 回调应用层的实际有效数据: `callback(data)`.
- 返回null: 一般用于报错后返回。不会回调`callback`.
- 返回false: 一般与callSvr的noex选项合用，如`callSvr(ac, callback, postData, {noex:1})`，表示由应用层回调函数来处理出错: `callback(false)`。

当返回false时，应用层可以通过`MUI.lastError.ret`来获取服务端返回数据。

@see lastError 出错时的上下文信息

@key callSvrExt['default']

(支持版本: v3.1)
如果要修改callSvr缺省调用方法，可以改写 MUI.callSvrExt['default']。示例：

	MUI.callSvrExt['default'] = {
		makeUrl: function(ac) {
			return '../api.php/' + ac;
		},
		dataFilter: function (data) {
			var ctx = this.ctx_ || {};
			if (data && $.isArray(data) && data.length >= 2 && typeof data[0] == "number") {
				if (data[0] == 0)
					return data[1];

				if (this.noex)
				{
					return false;
				}

				if (data[0] == E_NOAUTH) {
					// 如果支持自动重登录
					//if (MUI.tryAutoLogin()) {
					//	$.ajax(this);
					//}
					// 不支持自动登录，则跳转登录页
					MUI.popPageStack(0);
					MUI.showLogin();
					return;
				}
				else if (data[0] == E_AUTHFAIL) {
					app_alert("验证失败，请检查输入是否正确!", "e");
					return;
				}
				else if (data[0] == E_ABORT) {
					console.log("!!! abort call");
					return;
				}
				logError();
				app_alert("操作失败：" + data[1], "e");
			}
			else {
				logError();
				app_alert("服务器通讯协议异常!", "e"); // 格式不对
			}

			function logError()
			{
				console.log("failed call");
				console.log(ctx);
			}
		}
	};

@key callSvrExt[].beforeSend(opt) 为callSvr或$.ajax选项设置缺省值

如果有ajax选项想设置，可以使用beforeSend回调，例如POST参数使用JSON格式：

	MUI.callSvrExt['default'] = {
		beforeSend: function (opt) {
			// 示例：设置contentType
			if (opt.contentType == null) {
				opt.contentType = "application/json;charset=utf-8";
			}
			// 示例：添加HTTP头用于认证
			if (g_data.auth) {
				if (opt.headers == null)
					opt.headers = {};
				opt.headers["Authorization"] = "Basic " + g_data.auth;
			}
		}
	}

可以从opt.ctx_中取到{ac, ext, noex, dfd}等值（如opt.ctx_.ac），可以从opt.url中取到{ac, params}值。

如果要设置请求的HTTP headers，可以用`opt.headers = {header1: "value1", header2: "value2"}`.
更多选项参考jquery文档：jQuery.ajax的选项。

## 适配RESTful API

接口示例：更新订单

	PATCH /orders/{ORDER_ID}

	调用成功仅返回HTTP状态，无其它内容："200 OK" 或 "204 No Content"
	调用失败返回非2xx的HTTP状态及错误信息，无其它内容，如："400 bad id"

为了处理HTTP错误码，应设置：

	MUI.callSvrExt["default"] = {
		beforeSend: function (opt) {
			opt.handleHttpError = true;
		},
		dataFilter: function (data) {
			var ctx = this.ctx_;
			if (ctx && ctx.status) {
				if (this.noex)
					return false;
				app_alert(ctx.statusText, "e");
				return;
			}
			return data;
		}
	}

- 在beforeSend回调中，设置handleHttpError为true，这样HTTP错误会由dataFilter处理，而非框架自动处理。
- 在dataFilter回调中，如果this.ctx_.status非空表示是HTTP错误，this.ctx_.statusText为错误信息。
- 如果操作成功但无任何返回数据，回调函数fn(data)中data值为undefined（当HTTP状态码为204）或空串（非204返回）
- 不要设置ajax调用失败的回调，如`$.ajaxSetup({error: fn})`，`$.ajax({error: fn})`，它会覆盖框架的处理.

如果接口在出错时，返回固定格式的错误对象如{code, message}，可以这样处理：

	MUI.callSvrExt["default"] = {
		beforeSend: function (opt) {
			opt.handleHttpError = true;
		},
		dataFilter: function (data) {
			var ctx = this.ctx_;
			if (ctx && ctx.status) {
				if (this.noex)
					return false;
				if (data && data.message) {
					app_alert(data.message, "e");
				}
				else {
					app_alert("操作失败: 服务器错误. status=" + ctx.status + "-" + ctx.statusText, "e");
				}
				return;
			}
			return data;
		}
	}

调用接口时，HTTP谓词可以用callSvr的userOptions中给定，如：

	callSvr("orders/" + orderId, fn, postParam, {type: "PATCH"});
	
这种方式简单，但因调用名ac是变化的，不易模拟接口。
如果要模拟接口，可以保持调用名ac不变，像这样调用：

	callSvr("orders/{id}", {id: orderId}, fn, postParam, {type: "PATCH"});

于是可以这样做接口模拟：

	MUI.mockData = {
		"orders/{id}": function (param, postParam) {
			var ret = "OK";
			// 获取资源
			if (this.type == "GET") {
				ret = orders[param.id];
			}
			// 更新资源
			else if (this.type == "PATCH") {
				$.extend(orders[param.id], postParam);
			}
			// 删除资源
			else if (this.type == "DELETE") {
				delete orders[param.id];
			}
			return [0, ret];
		}
	};

不过这种写法需要适配，以生成正确的URL，示例：

	MUI.callSvrExt["default"] = {
		makeUrl: function (ac, param) {
			ac = ac.replace(/\{(\w+)\}/g, function (m, m1) {
				var ret = param[m1];
				assert(ret != null, "缺少参数");
				delete param[m1];
				return ret;
			});
			return "./api.php/" + ac;
		}
	}

## ES6支持：jQuery的$.Deferred兼容Promise接口 / 使用await

支持Promise/Deferred编程风格:

	var dfd = callSvr("...");
	dfd.then(function (data) {
		console.log(data);
	})
	.catch(function (err) {
		app_alert(err);
	})
	.finally(...)

支持catch/finally等Promise类接口。接口逻辑失败时，dfd.reject()触发fail/catch链。

支持await编程风格，上例可写为：

	// 使用await时callSvr调用失败是无法返回的，加{noex:1}选项可让失败时返回false
	var rv = callSvr("...", $.noop, null, {noex:1});
	if (rv === false) {
		// 失败逻辑 dfd.catch. 取错误信息用WUI.lastError={ac, tm, tv, ret}
		console.log(WUI.lastError.ret)
	}
	else {
		// 成功逻辑 dfd.then
	}
	// finally逻辑

示例：

	let rv = await callSvr("Ordr.query", {res:"count(*) cnt", fmt:"one"})
	let cnt = rv.cnt

## 直接取json类文件

(v5.5) 如果ac是调用相对路径, 则直接当成最终路径, 不做url拼接处理:

	callSvr("./1.json"); // 如果是callSvr("1.json") 则实际url可能是 "../api.php/1.json"这样.
	callSvr("../1.php");

相当于调用

	$.ajax("../1.php", {dataType: "json", success: callback})
	或
	$.getJSON("../1.php", callback);

注意下面调用未指定dataType, 不会按筋斗云协议格式处理:

	$.ajax("../1.php", {success: callback})

@see $.ajax
*/
self.callSvr = callSvr;
self.callSvrExt = {};
function callSvr(ac, params, fn, postParams, userOptions)
{
	if ($.isFunction(params)) {
		// 兼容格式：callSvr(url, fn?, postParams?, userOptions?);
		userOptions = postParams;
		postParams = fn;
		fn = params;
		params = null;
	}
	mCommon.assert(ac != null, "*** bad param `ac`");

	var ext = null;
	var ac0 = ac.action || ac; // ac可能是makeUrl生成过的
	var m;
	if ($.isArray(ac)) {
		// 兼容[ac, ext]格式, 不建议使用，可用"{ext}:{ac}"替代
		mCommon.assert(ac.length == 2, "*** bad ac format, require [ac, ext]");
		ext = ac[1];
		if (ext != 'default')
			ac0 = ext + ':' + ac[0];
		else
			ac0 = ac[0];
	}
	// "{ext}:{ac}"格式，注意区分"http://xxx"格式
	else if (m = ac.match(/^(\w+):(\w.*)/)) {
		ext = m[1];
	}
	else if (self.callSvrExt['default']) {
		ext = 'default';
	}

	var isSyncCall = (userOptions && userOptions.async == false);
	if (m_curBatch && !isSyncCall)
	{
		return m_curBatch.addCall({ac: ac, get: params, post: postParams}, fn, userOptions);
	}

	var url = makeUrl(ac, params);
	var ctx = {ac: ac0, tm: new Date()};
	if (userOptions && userOptions.noLoadingImg)
		ctx.noLoadingImg = 1;
	if (userOptions && userOptions.noex)
		ctx.noex = 1;
	if (ext) {
		ctx.ext = ext;
	}
	ctx.dfd = $.Deferred();
	if (self.mockData && self.mockData[ac0]) {
		ctx.isMock = true;
		ctx.getMockData = function () {
			var d = self.mockData[ac0];
			var param1 = $.extend({}, url.params);
			var postParam1 = $.extend({}, postParams);
			if ($.isFunction(d)) {
				d = d(param1, postParam1);
			}
			if (self.options.logAction)
				console.log({ac: ac0, ret: d, params: param1, postParams: postParam1, userOptions: userOptions});
			return d;
		}
	}
	enterWaiting(ctx);

	var callType = "call";
	if (isSyncCall)
		callType += "-sync";
	if (ctx.isMock)
		callType += "-mock";

	var method = (postParams == null? 'GET': 'POST');
	var opt = {
		dataType: 'text',
		url: url,
		data: postParams,
		type: method,
		success: fn,
		// 允许跨域使用cookie/session/authorization header
		xhrFields: {
			withCredentials: true
		},
		ctx_: ctx
	};
	// support FormData object.
	if (window.FormData && postParams instanceof FormData) {
		opt.processData = false;
		opt.contentType = false;
	}
	$.extend(opt, userOptions);
	if (ext && self.callSvrExt[ext].beforeSend) {
		self.callSvrExt[ext].beforeSend(opt);
	}

	// 自动判断是否用json格式
	if (!opt.contentType && opt.data) {
		var useJson = $.isArray(opt.data);
		if (!useJson && $.isPlainObject(opt.data)) {
			$.each(opt.data, function (i, e) {
				if (typeof(e) == "object") {
					useJson = true;
					return false;
				}
			})
		}
		if (useJson) {
			opt.contentType = "application/json";
		}
	}

	// post json content
	var isJson = opt.contentType && opt.contentType.indexOf("/json")>0;
	if (isJson && opt.data instanceof Object)
		opt.data = JSON.stringify(opt.data);

	console.log(callType + ": " + opt.type + " " + ac0);
	if (ctx.isMock)
		return callSvrMock(opt, isSyncCall);
	$.ajax(opt);
	// dfd.resolve/reject is done in defDataProc
	return ctx.dfd;
}

// opt = {success, .ctx_={isMock, getMockData, dfd} }
function callSvrMock(opt, isSyncCall)
{
	var dfd_ = opt.ctx_.dfd;
	var opt_ = opt;
	if (isSyncCall) {
		callSvrMock1();
	}
	else {
		setTimeout(callSvrMock1, self.options.mockDelay);
	}
	return dfd_;

	function callSvrMock1() 
	{
		var data = opt_.ctx_.getMockData();
		if (typeof(data) != "string")
			data = JSON.stringify(data);
		var rv = defDataProc.call(opt_, data);
		if (rv !== RV_ABORT)
		{
			opt_.success && opt_.success(rv);
//			dfd_.resolve(rv); // defDataProc resolve it
			return;
		}
		self.app_abort();
	}
}

/**
@fn callSvrSync(ac, [params?], fn?, postParams?, userOptions?)
@return data 原型规定的返回数据

同步模式调用callSvr.

@see callSvr
*/
self.callSvrSync = callSvrSync;
function callSvrSync(ac, params, fn, postParams, userOptions)
{
	var ret;
	if ($.isFunction(params)) {
		userOptions = postParams;
		postParams = fn;
		fn = params;
		params = null;
	}
	userOptions = $.extend({async: false}, userOptions);
	var dfd = callSvr(ac, params, function (data) {
		ret = data;
		fn && fn.call(this, data);
	}, postParams, userOptions);
	return ret;
}

/**
@fn setupCallSvrViaForm($form, $iframe, url, fn, callOpt)

该方法已不建议使用。上传文件请用FormData。
@see example-upload,callSvr

@param $iframe 一个隐藏的iframe组件.
@param callOpt 用户自定义参数. 参考callSvr的同名参数. e.g. {noex: 1}

一般对后端的调用都使用callSvr函数, 但像上传图片等操作不方便使用ajax调用, 因为要自行拼装multipart/form-data格式的请求数据. 
这种情况下可以使用form的提交和一个隐藏的iframe来实现类似的调用.

先定义一个form, 在其中放置文件上传控件和一个隐藏的iframe. form的target属性设置为iframe的名字:

	<form data-role="content" action="upload" method=post enctype="multipart/form-data" target="ifrUpload">
		<input type=file name="file[]" multiple accept="image/*">
		<input type=submit value="上传">
		<iframe id='ifrUpload' name='ifrUpload' style="display:none"></iframe>
	</form>

然后就像调用callSvr函数一样调用setupCallSvrViaForm:

	var url = MUI.makeUrl("upload", {genThumb: 1});
	MUI.setupCallSvrViaForm($frm, $frm.find("iframe"), url, onUploadComplete);
	function onUploadComplete(data) 
	{
		alert("上传成功");
	}

 */
self.setupCallSvrViaForm = setupCallSvrViaForm;
function setupCallSvrViaForm($form, $iframe, url, fn, callOpt)
{
	$form.attr("action", url);

	$iframe.on("load", function () {
		var data = this.contentDocument.body.innerText;
		if (data == "")
			return;
		var rv = defDataProc.call(callOpt, data);
		if (rv === RV_ABORT)
			self.app_abort();
		fn(rv);
	});
}

/**
@class batchCall(opt?={useTrans?=0})

批量调用。将若干个调用打包成一个特殊的batch调用发给服务端。
注意：

- 同步调用callSvrSync不会加入批处理。
- 对特别几个不符合BPQ协议输出格式规范的接口不可使用批处理，如upload, att等接口。
- 如果MUI.disableBatch=true, 表示禁用批处理。

示例：

	var batch = new MUI.batchCall();
	callSvr("Family.query", {res: "id,name"}, api_FamilyQuery);
	callSvr("User.get", {res: "id,phone"}, api_UserGet);
	batch.commit();

以上两条调用将一次发送到服务端。
在批处理中，默认每条调用是一个事务，如果想把批处理中所有调用放到一个事务中，可以用useTrans选项：

	var batch = new MUI.batchCall({useTrans: 1});
	callSvr("Attachment.add", api_AttAdd, {path: "path-1"});
	callSvr("Attachment.add", api_AttAdd, {path: "path-2"});
	batch.commit();

在一个事务中，所有调用要么成功要么都取消。
任何一个调用失败，会导致它后面所有调用取消执行，且所有已执行的调用会回滚。

参数中可以引用之前结果中的值，引用部分需要用"{}"括起来，且要在opt.ref参数中指定哪些参数使用了引用：


	MUI.useBatchCall();
	callSvr("..."); // 这个返回值的结果将用于以下调用
	callSvr("Ordr.query", {
		res: "id,dscr",
		status: "{$-1.status}",  // 整体替换，结果可以是一个对象
		cond: "id>{$-1.id}" // 部分替换，其结果只能是字符串
	}, api_OrdrQuery, {
		ref: ["status", "cond"] // 须在ref中指定需要处理的key
	});

特别地，当get/post整个是一个字符串时，直接整体替换，无须在ref中指定，如：

	callSvr("Ordr.add", $.noop, "{$-1}", {contentType:"application/json"});

以下为引用格式示例：

	{$1} // 第1次调用的结果。
	{$-1} // 前1次调用的结果。
	{$-1.path} // 取前一次调用结果的path属性
	{$1[0]} // 取第1次调用结果（是个数组）的第0个值。
	{$1[0].amount}
	{$-1.price * $-1.qty} // 可以做简单的数值计算

如果值计算失败，则当作"null"填充。

综合示例：

	MUI.useBatchCall();
	callSvr("Ordr.completeItem", $.noop, {itemId:1})
	callSvr("Ordr.completeItem", $.noop, {itemId:2, qty:2})
	callSvr("Ordr.calc", $.noop, {items:["{$1}", "{$2}"]}, {contentType:"application/json", ref:["items"] });
	callSvr("Ordr.add", $.noop, "{$3}", {contentType:"application/json"});

@see useBatchCall
@see disableBatch
@see m_curBatch

*/
self.batchCall = batchCall;
function batchCall(opt)
{
	mCommon.assert(m_curBatch == null, "*** multiple batch call!");
	this.opt_ = opt;
	this.calls_ = [];
	this.callOpts_ = [];
	if (! self.disableBatch)
		m_curBatch = this;
}

batchCall.prototype = {
	// obj: { opt_, @calls_, @callOpts_ }
	// calls_: elem={ac, get, post}
	// callOpts_: elem={fn, opt, dfd}

	//* batchCall.addCall(call={ac, get, post}, fn, opt)
	addCall: function (call0, fn, opt0) {
		var call = $.extend({}, call0);
		var opt = $.extend({}, opt0);
		if (opt.ref) {
			call.ref = opt.ref;
		}
		if (call.ac && call.ac.makeUrl) {
			call.get = $.extend({}, call.ac.params, call.get);
			call.ac = call.ac.action;
		}
		this.calls_.push(call);

		var callOpt = {
			fn: fn,
			opt: opt,
			dfd: $.Deferred()
		};
		this.callOpts_.push(callOpt);
		return callOpt.dfd;
	},
	//* batchCall.dfd()
	deferred: function () {
		return this.dfd_;
	},
	//* @fn batchCall.commit()
	commit: function () {
		if (m_curBatch == null)
			return;
		m_curBatch = null;

		if (this.calls_.length < 1) {
			console.log("!!! warning: batch has " + this.calls_.length + " calls!");
			return;
		}
		if (this.calls_.length == 1) {
			// 只有一个调用，不使用batch
			var call = this.calls_[0];
			var callOpt = this.callOpts_[0];
			var dfd = callSvr(call.ac, call.get, callOpt.fn, call.post, callOpt.opt);
			dfd.then(function (data) {
				callOpt.dfd.resolve(data);
			});
			return;
		}
		var batch_ = this;
		var postData = this.calls_;
		callSvr("batch", this.opt_, api_batch, postData, {
			contentType: "application/json; charset=utf-8"
		});

		function api_batch(data)
		{
			var ajaxCtx_ = this;
			$.each(data, function (i, e) {
				var callOpt = batch_.callOpts_[i];
				// simulate ajaxCtx_, e.g. for {noex, userPost}
				var extendCtx = false;
				if (callOpt.opt && !$.isEmptyObject(callOpt.opt)) {
					extendCtx = true;
					$.extend(ajaxCtx_, callOpt.opt);
				}

				var data1 = defDataProc.call(ajaxCtx_, e);
				if (data1 !== RV_ABORT) {
					if (callOpt.fn) {
						callOpt.fn.call(ajaxCtx_, data1);
					}
					callOpt.dfd.resolve(data1);
				}

				// restore ajaxCtx_
				if (extendCtx) {
					$.each(Object.keys(callOpt.opt), function () {
						ajaxCtx_[this] = null;
					});
				}
			});
		}
	},
	//* @fn batchCall.cancel()
	cancel: function () {
		m_curBatch = null;
	}
}

/**
@fn useBatchCall(opt?={useTrans?=0}, tv?=0)

之后的callSvr调用都加入批量操作。例：

	MUI.useBatchCall();
	callSvr("Family.query", {res: "id,name"}, api_FamilyQuery);
	callSvr("User.get", {res: "id,phone"}, api_UserGet);

可指定多少毫秒以内的操作都使用批处理，如10ms内：

	MUI.useBatchCall(null, 10);

如果MUI.disableBatch=true, 该函数不起作用。

@see batchCall
@see disableBatch
*/
self.useBatchCall = useBatchCall;
function useBatchCall(opt, tv)
{
	if (self.disableBatch)
		return;
	if (m_curBatch != null)
		return;
	tv = tv || 0;
	var batch = new self.batchCall(opt);
	setTimeout(function () {
		batch.commit();
	}, tv);
}

}
// ====== WEBCC_END_FILE callSvr.js }}}

// ====== WEBCC_BEGIN_FILE wui-slim.js {{{
jdModule("jdcloud.wui", JdcloudWui);
function JdcloudWui()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

// 子模块
JdcloudApp.call(self);
JdcloudCall.call(self);

// ====== global {{{
/**
@var isBusy

标识应用当前是否正在与服务端交互。一般用于自动化测试。
*/
self.isBusy = false;

/**
@var g_args

应用参数。

URL参数会自动加入该对象，例如URL为 `http://{server}/{app}/index.html?orderId=10&dscr=上门洗车`，则该对象有以下值：

	g_args.orderId=10; // 注意：如果参数是个数值，则自动转为数值类型，不再是字符串。
	g_args.dscr="上门洗车"; // 对字符串会自动进行URL解码。

框架会自动处理一些参数：

- g_args._debug: 在测试模式下，指定后台的调试等级，有效值为1-9. 参考：后端测试模式 P_TEST_MODE，调试等级 P_DEBUG.
- g_args.autoLogin: 记住登录信息(token)，下次自动登录；注意：如果是在手机模式下打开，此行为是默认的。示例：http://server/jdcloud/web/?autoLogin

@see parseQuery URL参数通过该函数获取。
*/
window.g_args = {}; // {_debug}

/**
@var g_data = {userInfo?}

应用全局共享数据。

在登录时，会自动设置userInfo属性为个人信息。所以可以通过 g_data.userInfo==null 来判断是否已登录。

@key g_data.userInfo

*/
window.g_data = {}; // {userInfo}

/**
@var BASE_URL

TODO: remove

设置应用的基本路径, 应以"/"结尾.

*/
window.BASE_URL = "../";

window.FormMode = {
	forAdd: 'A',
	forSet: 'S',
	forLink: 'S', // 与forSet合并，此处为兼容旧版。
	forFind: 'F',
	forDel: 'D'  // 该模式实际上不会打开dlg
};

/**
@var WUI.options

{appName=user, title="客户端", onShowLogin, pageHome="pageHome", pageFolder="page"}

- appName: 用于与后端通讯时标识app.
- pageHome: 首页的id, 默认为"pageHome"
- pageFolder: 子页面或对话框所在文件夹, 默认为"page"
- closeAfterAdd: (=false) 设置为true时，添加数据后关闭窗口。默认行为是添加数据后保留并清空窗口以便连续添加。
- fuzzyMatch: (=false) 设置为true时，则查询对话框中的文本查询匹配字符串任意部分。
*/
self.options = {
	title: "客户端",
	appName: "user",
	onShowLogin: function () { throw "NotImplemented"; },
	pageHome: "pageHome",
	pageFolder: "page",

	serverUrl: "./",

	logAction: false,
	PAGE_SZ: 20,
	manualSplash: false,
	mockDelay: 50,

/**
@var WUI.options.moduleExt

用于模块扩展。有两个回调函数选项：

	// 定制模块的页面路径
	WUI.options.moduleExt.showPage = function (name) {
		// name为showPage或showDlg函数调用时的页面/对话框；返回实际页面地址；示例：
		var map = {
			"pageOrdr__Mes.html": "page/mes/pageOrdr.html",
			"pageOrdr__Mes.js": "page/mes/pageOrdr.js",
		};
		return map[name] || name;
	}
	// 定制模块的接口调用地址
	WUI.options.moduleExt.callSvr = function (name) {
		// name为callSvr调用的接口名，返回实际URL地址；示例：
		var map = {
			"Ordr__Mes.query" => "../../mes/api/Ordr.query",
			"Ordr__Item.query" => "../../mes/api/Item.query"
		}
		return map[name] || name;
	}

详细用法案例，可参考：筋斗云开发实例讲解 - 系统复用与微服务方案。
*/
	moduleExt: { showPage: $.noop, callSvr: $.noop }
};

//}}}

// set g_args
function parseArgs()
{
	if (location.search) {
		g_args = mCommon.parseQuery(location.search.substr(1));
	}
}
parseArgs();

/**
@fn app_alert(msg, [type?=i], [fn?], opt?={timeoutInterval?, defValue?, onCancel()?})
@param type 对话框类型: "i": info, 信息提示框; "e": error, 错误框; "w": warning, 警告框; "q"(与app_confirm一样): question, 确认框(会有"确定"和"取消"两个按钮); "p": prompt, 输入框
@param fn Function(text?) 回调函数，当点击确定按钮时调用。当type="p" (prompt)时参数text为用户输入的内容。
@param opt Object. 可选项。 timeoutInterval表示几秒后自动关闭对话框。defValue用于输入框(type=p)的缺省值.

使用jQuery easyui弹出提示对话框.

示例:

	// 信息框，3s后自动点确定
	app_alert("操作成功", function () {
		WUI.showPage("pageGenStat");
	}, {timeoutInterval: 3000});

	// 错误框
	app_alert("操作失败", "e");

	// 确认框(确定/取消)
	app_alert("立即付款?", "q", function () {
		WUI.showPage("#pay");
	});

	// 输入框
	app_alert("输入要查询的名字:", "p", function (text) {
		callSvr("Book.query", {cond: "name like '%" + text + "%'"});
	});

*/
self.app_alert = app_alert;
function app_alert(msg)
{
	console.log("app_alert", msg);
}

// ====== login token for auto login {{{
function tokenName()
{
	var name = "token";
	if (self.options.appName)
		name += "_" + self.options.appName;
	return name;
}

self.saveLoginToken = saveLoginToken;
function saveLoginToken(data)
{
	if (data._token)
	{
		mCommon.setStorage(tokenName(), data._token);
	}
}
self.loadLoginToken = loadLoginToken;
function loadLoginToken()
{
	return mCommon.getStorage(tokenName());
}
self.deleteLoginToken = deleteLoginToken;
function deleteLoginToken()
{
	mCommon.delStorage(tokenName());
}

/**
@fn tryAutoLogin(onHandleLogin, reuseCmd?)

@param onHandleLogin Function(data). 调用后台login()成功后的回调函数(里面使用this为ajax options); 可以直接使用WUI.handleLogin
@param reuseCmd String. 当session存在时替代后台login()操作的API, 如"User.get", "Employee.get"等, 它们在已登录时返回与login相兼容的数据. 因为login操作比较重, 使用它们可减轻服务器压力. 
@return Boolean. true=登录成功; false=登录失败.

该函数一般在页面加载完成后调用，如

	function main()
	{
		$.extend(WUI.options, {
			appName: APP_NAME,
			title: APP_TITLE,
			onShowLogin: showDlgLogin
		});

		WUI.tryAutoLogin(WUI.handleLogin, "Employee.get");
	}

	$(main);

该函数同步调用后端接口。如果要异步调用，请改用tryAutoLoginAsync函数，返回Deferred对象，resolve表示登录成功，reject表示登录失败。
*/
self.tryAutoLogin = tryAutoLogin;
function tryAutoLogin(onHandleLogin, reuseCmd)
{
	var ok = false;
	var ajaxOpt = {async: false, noex: true};

	function handleAutoLogin(data)
	{
		if (data === false) // has exception (as noex=true)
			return;

		if (onHandleLogin)
			onHandleLogin.call(this, data);
		ok = true;
	}

	// first try "User.get"
	if (reuseCmd != null) {
		self.callSvr(reuseCmd, handleAutoLogin, null, ajaxOpt);
	}
	if (ok)
		return ok;

	// then use "login(token)"
	var token = loadLoginToken();
	if (token != null)
	{
		var postData = {token: token};
		self.callSvr("login", handleAutoLogin, postData, ajaxOpt);
	}
	if (ok)
		return ok;

	self.options.onShowLogin();
	return ok;
}

self.tryAutoLoginAsync = tryAutoLoginAsync;
function tryAutoLoginAsync(onHandleLogin, reuseCmd)
{
	var ajaxOpt = {noex: true};
	var dfd = $.Deferred();

	function success(data) {
		if (onHandleLogin)
			onHandleLogin.call(this, data);
		dfd.resolve();
	}
	function fail() {
		dfd.reject();
		self.options.onShowLogin();
	}

	// first try "User.get"
	if (reuseCmd != null) {
		self.callSvr(reuseCmd, function (data) {
			if (data === false) {
				loginByToken()
				return;
			}
			success(data);
		}, null, ajaxOpt);
	}
	else {
		loginByToken();
	}

	// then use "login(token)"
	function loginByToken()
	{
		var token = loadLoginToken();
		if (token != null)
		{
			var postData = {token: token};
			self.callSvr("login", function (data) {
				if (data === false) {
					fail();
					return;
				}
				success(data);
			}, postData, ajaxOpt);
		}
		else {
			fail();
		}
	}
	return dfd.promise();
}

/**
@fn handleLogin(data)
@param data 调用API "login"成功后的返回数据.

处理login相关的操作, 如设置g_data.userInfo, 保存自动登录的token等等.

(v5.5) 如果URL中包含hash（即"#pageIssue"这样），且以"#page"开头，则登录后会自动打开同名的列表页（如"pageIssue"页面）。
*/
self.handleLogin = handleLogin;
function handleLogin(data)
{
	g_data.userInfo = data;
	// 自动登录: http://...?autoLogin
	if (g_args.autoLogin || /android|ipad|iphone/i.test(navigator.userAgent))
		saveLoginToken(data);

	self.showPage(self.options.pageHome);
	if (location.hash.startsWith("#page")) {
		WUI.showPage(location.hash.replace('#', ''));
	}
}
//}}}

// ------ plugins {{{
/**
@fn initClient()
*/
self.initClient = initClient;
var plugins_ = {};
function initClient()
{
	self.callSvrSync('initClient', function (data) {
		g_data.initClient = data;
		plugins_ = data.plugins || {};
		$.each(plugins_, function (k, e) {
			if (e.js) {
				// plugin dir
				var js = BASE_URL + 'plugin/' + k + '/' + e.js;
				mCommon.loadScript(js, {async:true});
			}
		});
	});
}

/**
@class Plugins
*/
window.Plugins = {
/**
@fn Plugins.exists(pluginName)
*/
	exists: function (pname) {
		return plugins_[pname] !== undefined;
	},

/**
@fn Plugins.list()
*/
	list: function () {
		return plugins_;
	}
};
//}}}

/**
@fn setApp(opt)

@see options

TODO: remove. use $.extend instead.
*/
self.setApp = setApp;
function setApp(app)
{
	$.extend(self.options, app);
}

/**
@fn logout(dontReload?=0)
@param dontReload 如果非0, 则注销后不刷新页面.

注销当前登录, 成功后刷新页面(除非指定dontReload=1)
返回logout调用的deferred对象
*/
self.logout = logout;
function logout(dontReload)
{
	deleteLoginToken();
	g_data.userInfo = null;
	return self.callSvr("logout", function (data) {
		if (! dontReload)
			mCommon.reloadSite();
	});
}

/**
@fn showLoading()
*/
self.showLoading = showLoading;
function showLoading()
{
	console.log('loading');
}

/**
@fn hideLoading()
*/
self.hideLoading = hideLoading;
function hideLoading()
{
	console.log('hide loading');
}

}

(function () {

var mCommon = jdModule("jdcloud.common");

window.WUI = jdModule("jdcloud.wui");
$.extend(WUI, mCommon);
$.each([
	"intSort",
	"numberSort",
// 	"enterWaiting",
// 	"leaveWaiting",
// 	"makeUrl",
	"callSvr",
	"callSvrSync",
	"app_alert",
	"app_confirm",
	"app_show",
// 	"makeLinkTo",
], function () {
	window[this] = WUI[this];
});

})();

// vi: foldmethod=marker
// ====== WEBCC_END_FILE wui-slim.js }}}

// Generated by webcc_merge
// vi: foldmethod=marker

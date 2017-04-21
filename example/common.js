/**
@module common.js

JS通用函数库
*/

/**
@fn randInt(from, to)

生成一个随机整数。如生成10到20间的随机整数：

	var n = randInt(10, 20)

*/
function randInt(from, to)
{
	return Math.floor(Math.random() * (to - from + 1)) + from;
}

/**
@fn randAlphanum(cnt)

生成指定长度(cnt)的随机代码。不出现"0","1","o","l"这些易混淆字符。

示例：生成8位随机密码

	var dyn_pwd = randAlphanum(8);

*/
function randAlphanum(cnt)
{
	var r = '';
	var i;
	var char_a = 'a'.charCodeAt(0);
	var char_o = 'o'.charCodeAt(0);
	var char_l = 'l'.charCodeAt(0);
	for (i=0; i<cnt; ) {
		ran = randInt(0, 35);
		if (ran == 0 || ran == 1 || ran == char_o - char_a + 10 || ran == char_l - char_a + 10) {
			continue;
		}
		if (ran > 9) {
			ran = String.fromCharCode(ran - 10 + char_a);
		}
		r += ran;
		i ++;
	}
	return r;
}

// eg. range(1, 10)
// eg. range(1, 10, 3)
// eg. range(1, 100, 3, 10)
function range(from, to, step, max) // (from, to, step=1, max=0)
{
	var arr = [];
	if (!step) {
		step = 1;
	}
	for (i=0, v=from; (!max || i<max) && v<=to; ++i, v+=step) {
		arr[i] = v;
	}
	return arr;
}

/**
@fn basename(name, ext?)

取名字的基础部分，如

	var name = basename("/cc/ttt.asp"); // "ttt.asp"
	var name2 = basename("c:\\aaa\\bbb/cc/ttt.asp", ".asp"); // "ttt"

 */
function basename(name, ext)
{
	name = name.replace(/^.*(\\|\/)/, '');
	if (! ext) 
		return name;
	var i = name.length - ext.length;
	return name.indexOf(ext, i) == -1? name: name.substring(0, i);
}

// use $.isArray or Array.isArray instead.
function isArray(o)
{
	return o instanceof Array;
// 	return o.constructor === Array;
}

function DateAdd(sInterval, n, dt)
{
	return new Date(dt).add(sInterval, n);
}

function DateDiff(sInterval, dtStart, dtEnd)
{
	return dtStart.diff(sInterval, dtEnd);
}

function dateStr(s)
{
	var dt = parseDate(s);
	if (dt == null)
		return "";
	return dt.format("D");
}

function dtStr(s)
{
	var dt = parseDate(s);
	if (dt == null)
		return "";
	return dt.format("yyyy-mm-dd HH:MM");
}

/**
@fn row2tr(row)
@return jquery tr对象
@param row {\@cols}, col: {useTh?=false, html?, \%css?, \%attr?, \%on?}

根据row结构构造jQuery tr对象。
*/
function row2tr(row)
{
	var jtr = $("<tr></tr>");
	$.each(row.cols, function (i, col) {
		var jtd = $(col.useTh? "<th></th>": "<td></td>");
		jtd.appendTo(jtr);
		if (col.html != null)
			jtd.html(col.html);
		if (col.css != null)
			jtd.css(col.css);
		if (col.attr != null)
			jtd.attr(col.attr);
		if (col.on != null)
			jtd.on(col.on);
	});
	return jtr;
}

/**
--@fn $.getScriptWithCache(url, options?)

$.getScriptWithCache = function(url, options) 
{
	// allow user to set any option except for dataType, cache, and url
	options = $.extend(options || {}, {
		dataType: "script",
		cache: true,
		url: url
	});

	// Use $.ajax() since it is more flexible than $.getScript
	// Return the jqXHR object so we can chain callbacks
	return jQuery.ajax(options);
};
*/

/**
@fn jQuery.fn.getAncestor(expr)

取符合条件(expr)的对象，一般可使用$.closest替代
*/
$.fn.getAncestor = function (expr) {
	var jo = this;
	while (jo && !jo.is(expr)) {
		jo = jo.parent();
	}
	return jo;
}

//TODO
/**
@fn app_abort()

中止之后的调用, 直接返回.
*/
function app_abort()
{
	throw("abort");
}

// allow throw("abort") as abort behavior.
window.onerror = function (msg) {
	if (/abort$/.test(msg))
		return true;
};


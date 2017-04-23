jdModule("jdcloud.common", ns_jdcloud_commonjq);
function ns_jdcloud_commonjq()
{
var self = this;

self.assert(window.jQuery, "require jquery lib.");
/**
@fn getFormData(jo)

取DOM对象中带name属性的子对象的内容, 放入一个JS对象中, 以便手工调用callSvr.

注意: 

- 这里Form不一定是Form标签, 可以是一切DOM对象.
- 如果DOM对象有disabled属性, 则会忽略它, 这也与form提交时的规则一致.

与setFormData配合使用时, 可以只返回变化的数据.

	jf.submit(function () {
		var ac = jf.attr("action");
		callSvr(ac, fn, getFormData(jf));
	});

@see setFormData
 */
self.getFormData = getFormData;
function getFormData(jo)
{
	var data = {};
	var orgData = jo.data("origin_") || {};
	jo.find("[name]:not([disabled])").each (function () {
		var ji = $(this);
		var name = ji.attr("name");
		var content;
		if (ji.is(":input"))
			content = ji.val();
		else
			content = ji.html();

		var orgContent = orgData[name];
		if (orgContent == null)
			orgContent = "";
		if (content == null)
			content = "";
		if (content !== String(orgContent)) // 避免 "" == 0 或 "" == false
			data[name] = content;
	});
	return data;
}

/**
@fn setFormData(jo, data?, opt?)

用于为带name属性的DOM对象设置内容为data[name].
要清空所有内容, 可以用 setFormData(jo), 相当于增强版的 form.reset().

注意:
- DOM项的内容指: 如果是input/textarea/select等对象, 内容为其value值; 如果是div组件, 内容为其innerHTML值.
- 当data[name]未设置(即值为undefined, 注意不是null)时, 对于input/textarea等组件, 行为与form.reset()逻辑相同, 
 即恢复为初始化值, 除了input[type=hidden]对象, 它的内容不会变.
 对div等其它对象, 会清空该对象的内容.
- 如果对象设置有属性"noReset", 则不会对它进行设置.

@param opt {setOrigin?=false}

选项 setOrigin: 为true时将data设置为数据源, 这样在getFormData时, 只会返回与数据源相比有变化的数据.
缺省会设置该DOM对象数据源为空.

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
	var jo1 = jo.filter("[name]:not([noReset])");
	jo.find("[name]:not([noReset])").add(jo1).each (function () {
		var ji = $(this);
		var name = ji.attr("name");
		var content = data[name];
		var isInput = ji.is(":input");
		if (content === undefined) {
			if (isInput) {
				if (ji[0].tagName === "TEXTAREA")
					content = ji.html();
				else
					content = ji.attr("value");
				if (content === undefined)
					content = "";
			}
			else {
				content = "";
			}
		}
		if (ji.is(":input")) {
			ji.val(content);
		}
		else {
			ji.html(content);
		}
	});
	jo.data("origin_", opt1.setOrigin? data: null);
}

/**
@fn loadScript(url, fnOK?, ajaxOpt?)

@param fnOK 加载成功后的回调函数
@param ajaxOpt 传递给$.ajax的额外选项。

默认未指定ajaxOpt时，简单地使用添加script标签机制异步加载。如果曾经加载过，可以重用cache。

如果指定ajaxOpt，且非跨域，则通过ajax去加载，可以支持同步调用。如果是跨域，仍通过script标签方式加载，注意加载完成后会自动删除script标签。

返回defered对象(与$.ajax类似)，可以用 dfd.then() / dfd.fail() 异步处理。

常见用法：

- 动态加载一个script，异步执行其中内容：

		loadScript("1.js", onload); // onload中可使用1.js中定义的内容
		loadScript("http://otherserver/path/1.js"); // 跨域加载

- 加载并立即执行一个script:

		loadScript("1.js", {async: false});
		// 可立即使用1.js中定义的内容

如果要动态加载script，且使用后删除标签（里面定义的函数会仍然保留），建议直接使用`$.getScript`，它等同于：

	loadScript("1.js", {cache: false});

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
				console.log("*** loadScript fails for " + url);
				console.log(err);
			}
		}, options);

		return jQuery.ajax(ajaxOpt);
	}

	var dfd_ = $.Deferred();
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= url;
	// script.async = !sync; // 不是同步调用的意思，参考script标签的async属性和defer属性。
	script.onload = function () {
		if (fnOK)
			fnOK();
		dfd_.resolve();
	}
	script.onerror = function () {
		dfd_.reject();
		console.log("*** loadScript fails for " + url);
	}
	document.head.appendChild(script);
	return dfd_;
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
		var dt = parseDate(this.value);
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
		var dt = parseTime(this.value);
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

}

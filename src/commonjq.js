jdModule("jdcloud.common", JdcloudCommonJq);
function JdcloudCommonJq()
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

@see setFormData
 */
self.getFormData = getFormData;
function getFormData(jo)
{
	var data = {};
	var isFormData = false;
	var enctype = jo.attr("enctype");
	if ( (enctype && enctype.toLowerCase() == "multipart/form-data") || jo.has("[name]:file").size() >0) {
		isFormData = true;
		data = new FormData();
	}
	var orgData = jo.data("origin_") || {};
	formItems(jo, function (name, content) {
		var ji = this;
		var orgContent = orgData[name];
		if (orgContent == null)
			orgContent = "";
		if (content == null)
			content = "";
		if (content !== String(orgContent)) // 避免 "" == 0 或 "" == false
		{
			if (! isFormData) {
				data[name] = content;
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
@fn formItems(jo, cb)

遍历jo下带name属性的有效控件，回调cb函数。

注意:

- 忽略有disabled属性的控件
- 忽略未选中的checkbox/radiobutton

@param cb(name, val) this=ji=当前jquery对象
当cb返回false时可中断遍历。

 */
self.formItems = formItems;
function formItems(jo, cb)
{
	jo.find("[name]:not([disabled])").each (function () {
		var name = this.name;
		if (! name)
			return;

		var ji = $(this);
		var val;
		if (ji.is(":input")) {
			if (this.type == "checkbox" && !this.checked)
				return;
			if (this.type == "radio" && !this.checked)
				return;
			val = ji.val();
		}
		else {
			val = ji.html();
		}
		if (cb.call(ji, name,  val) === false)
			return false;
	});
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
	
	注意：如果是跨域加载，不支持同步调用（$.ajax的限制），如：

		loadScript("http://oliveche.com/1.js", {async: false});
		// 一旦跨域，选项{async:false}指定无效，不可立即使用1.js中定义的内容。

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
@fn rgb2hex(rgb)

将jquery取到的颜色转成16进制形式，如："rgb(4, 190, 2)" -> "#04be02"

示例：

	var color = rgb2hex( $(".mui-container").css("backgroundColor") );

 */
self.rgb2hex = rgb2hex;
function rgb2hex(rgb)
{
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
			b64src = img.src;
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

}

function JdcloudPage()
{
var self = this;
// 模块内共享
self.ctx = self.ctx || {};

var mCommon = jdModule("jdcloud.common");
var m_batchMode = false; // 批量操作模式, 按住Ctrl键。

/**
@fn isBatchMode()

是否批量操作模式（即是否按住Ctrl键操作）。
*/
self.isBatchMode = function () {
	return m_batchMode;
}

self.toggleBatchMode = toggleBatchMode;
function toggleBatchMode(val) {
	if (val !== undefined)
		m_batchMode = val;
	else
		m_batchMode = !m_batchMode;
	app_alert("批量模式: " + (m_batchMode?"ON":"OFF"));
	// 标题栏显示红色. 在style.css中设置#my-tabMain.batchMode.
	self.tabMain.toggleClass("batchMode", m_batchMode);

	// 允许点击多选
	var opt = WUI.getActivePage().find(".datagrid-f").datagrid("options");
	opt.ctrlSelect = !m_batchMode;
	$.fn.datagrid.defaults.singleSelect = false;
	$.fn.datagrid.defaults.ctrlSelect = !m_batchMode;
}

mCommon.assert($.fn.combobox, "require jquery-easyui lib.");

/**
@fn getRow(jtbl) -> row

用于列表中选择一行来操作，返回该行数据。如果未选则报错，返回null。

	var row = WUI.getRow(jtbl);
	if (row == null)
		return;

 */
self.getRow = getRow;
function getRow(jtbl, silent)
{
	var row = jtbl.datagrid('getSelected');
	if (! row && ! silent)
	{
		self.app_alert("请先选择一行。", "w");
		return null;
	}
	return row;
}

/**
@fn isTreegrid(jtbl)

判断是treegrid还是datagrid。
示例：

	var datagrid = WUI.isTreegrid(jtbl)? "treegrid": "datagrid";
	var opt = jtbl[datagrid]("options");

 */
self.isTreegrid = isTreegrid;
function isTreegrid(jtbl)
{
	var d;
	if (jtbl == null || jtbl.size() == 0 || (d=jtbl.data()) == null)
		return false;
	return !! d.treegrid;
}

/** 
@fn reload(jtbl, url?, queryParams?, doAppendFilter?) 

刷新数据表，或用指定查询条件重新查询。

url和queryParams都可以指定查询条件，url通过makeUrl指定查询参数，它是基础查询一般不改变；
queryParams在查询对话框做查询时会被替换、或是点Ctrl-刷新时会被清除；如果doAppendFilter为true时会叠加之前的查询条件。
在明细对话框上三击字段标题可查询，按住Ctrl后三击则是追加查询模式。
*/
self.reload = reload;
function reload(jtbl, url, queryParams, doAppendFilter)
{
	var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
	if (url != null || queryParams != null) {
		var opt = jtbl[datagrid]("options");
		if (url != null) {
			opt.url = url;
		}
		if (queryParams != null) {
			opt.queryParams = doAppendFilter? self.extendQueryParam(opt.queryParams, queryParams): queryParams;
		}
	}

	// 如果当前页面不是table所在页，则先切换到所在页
	if (jtbl.is(":hidden")) {
		var opage = mCommon.getAncestor(jtbl[0], istab);
		if (opage && opage.title)
			$(opage).closest(".easyui-tabs").tabs("select", opage.title);
	}

	resetPageNumber(jtbl);
	jtbl[datagrid]('reload');
	jtbl[datagrid]('clearSelections');
}

/** 
@fn reloadTmp(jtbl, url?, queryParams?) 
临时reload一下，完事后恢复原url
*/
self.reloadTmp = reloadTmp;
function reloadTmp(jtbl, url, queryParams)
{
	var opt = jtbl.datagrid("options");
	var url_bak = opt.url;
	var param_bak = opt.queryParams;

	reload(jtbl, url, queryParams);

	// restore param
	opt.url = url_bak;
	opt.queryParams = param_bak;
}

// 筋斗云协议的若干列表格式转为easyui-datagrid的列表格式
// 支持 [], { @list}, { @h, @d}格式 => {total, @rows}
function jdListToDgList(data)
{
	var ret = data;
	// support simple array
	if ($.isArray(data)) {
		ret = {
			total: data.length,
			rows: data
		};
	}
	else if ($.isArray(data.list)) {
		ret = {
			total: data.total || data.list.length,
			rows: data.list
		};
	}
	// support compressed table format: {h,d}
	else if (data.h !== undefined)
	{
		var arr = mCommon.rs2Array(data);
		ret = {
			total: data.total || arr.length,
			rows: arr
		};
	}
	return ret;
}

// 筋斗云协议的列表转为数组，支持 [], {list}, {h,d}格式
function jdListToArray(data)
{
	var ret = data;
	// support simple array
	if ($.isArray(data)) {
		ret = data;
	}
	else if ($.isArray(data.list)) {
		ret = data.list;
	}
	// support compressed table format: {h,d}
	else if (data.h !== undefined)
	{
		ret = mCommon.rs2Array(data);
	}
	return ret;
}

/*
jdListToDgList处理后的数据格式：

	{total:10, rows:[
		{id:1, name, fatherId: null},
		{id:2, name, fatherId: 1},
		...
	]}

为适合treegrid显示，应为子结点添加_parentId字段：

	{total:10, rows:[
		{id:1, ...}
		{id:2, ..., _parentId:1},
		...
	]}

easyui-treegrid会将其再转成层次结构：

	{total:10, rows:[
		{id:1, ..., children: [
			{id:2, ...},
		]}
		...
	]}

特别地，为了查询结果能正常显示（排除展开结点操作的查询，其它查询的树表是残缺不全的），当发现数据有fatherId但父结点不在列表中时，不去设置_parentId，避免该行无法显示。
*/
function jdListToTree(data, idField, fatherField, parentId, isLeaf)
{
	var data1 = jdListToDgList(data)

	var idMap = {};
	$.each(data1.rows, function (i, e) {
		idMap[e[idField]] = true;
	});
	$.each(data1.rows, function (i, e) {
		var fatherId = e[fatherField];
		// parentId存在表示异步查询子结点, 应设置_parentId字段.
		if (fatherId && (idMap[fatherId] || parentId)) {
			e._parentId = fatherId;
		}
		if (isLeaf && !isLeaf(e)) {
			e.state = 'closed'; // 如果无结点, 则其展开时将触发ajax查询子结点
		}
	})
	return data1;
}

/** 
@fn reloadRow(jtbl, rowData?)

@param rowData 通过原始数据指定行，可通过WUI.getRow(jtbl)获取当前所选择的行数据。

rowData如果未指定，则使用当前选择的行。

示例：

	var row = WUI.getRow(jtbl);
	if (row == null)
		return;
	...
	WUI.reloadRow(jtbl, row);

如果要刷新整个表，可用WUI.reload(jtbl)。
刷新整个页面可用WUI.reloadPage()，但一般只用于调试，不用于生产环境。

返回Deferred对象，表示加载完成。
 */
self.reloadRow = reloadRow;
function reloadRow(jtbl, rowData)
{
	var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
	if (rowData == null) {
		rowData = jtbl[datagrid]('getSelected');
		if (rowData == null)
			return;
	}
	jtbl[datagrid]("loading");
	var opt = jtbl[datagrid]("options");
	return self.callSvr(opt.url, api_queryOne, {cond: "id=" + rowData.id});

	function api_queryOne(data) 
	{
		jtbl[datagrid]("loaded");
		var idx = jtbl[datagrid]("getRowIndex", rowData);
		var objArr = jdListToArray(data);
		if (datagrid == "treegrid") {
			$.extend(rowData, objArr[0]);
			var fatherId = rowData[opt.fatherField]; // "fatherId"
			var id = rowData[opt.idField];
			if (rowData["_parentId"] && rowData["_parentId"] != fatherId) {
				rowData["_parentId"] = fatherId;
				jtbl.treegrid("remove", id);
				jtbl.treegrid("append", {
					parent: rowData["_parentId"],
					data: [rowData]
				});
			}
			else {
				jtbl.treegrid("update", {id: id, row: rowData});
			}
			return;
		}
		if (idx != -1 && objArr.length == 1) {
			// NOTE: updateRow does not work, must use the original rowData
// 			jtbl.datagrid("updateRow", {index: idx, row: data[0]});
			for (var k in rowData) 
				delete rowData[k];
			$.extend(rowData, objArr[0]);
			jtbl.datagrid("refreshRow", idx);
		}
	}
}

function appendRow(jtbl, id)
{
	var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
	jtbl[datagrid]("loading");
	var opt = jtbl[datagrid]("options");
	self.callSvr(opt.url, api_queryOne, {cond: "id=" + id});

	function api_queryOne(data)
	{
		jtbl[datagrid]("loaded");
		var objArr = jdListToArray(data);
		if (objArr.length != 1)
			return;
		var row = objArr[0];
		if (datagrid == "treegrid") {
			if (jtbl.treegrid('getData').length == 0) { // bugfix: 加第一行时，使用loadData以删除“没有数据”这行
				jtbl.treegrid('loadData', [row]);
				return;
			}
			var fatherId = row[opt.fatherField];
			jtbl.treegrid('append',{
				parent: fatherId,
				data: [row]
			});
			return;
		}
		if (opt.sortOrder == "desc")
			jtbl.datagrid("insertRow", {index:0, row: row});
		else
			jtbl.datagrid("appendRow", row);
	}
}

function tabid(title)
{
	return "pg_" + title.replace(/[ ()\[\]\/\\,<>.!@#$%^&*-+]+/g, "_");
}
function istab(o)
{
	var id = o.getAttribute("id");
	return id && id.substr(0,3) == "pg_";
}

// // 取jquery-easyui dialog 对象
// function getDlg(o)
// {
// 	return getAncestor(o, function (o) {
// 		return o.className && o.className.indexOf('window-body') >=0;
// 	});
// }

// function closePage(title)
// {
// 	var o = $("#pg_" + title).find("div");
// 	if (o.length > 0) {
// 		alert(o[0].id);
// 		o.appendTo($("#hidden_pages"));
// 		alert("restore");
// 	}
// }

// paramArr?
function callInitfn(jo, paramArr)
{
	if (jo.jdata().init)
		return;
	jo.jdata().init = true;

	var attr = jo.attr("my-initfn");
	if (attr == null)
		return;

	try {
		initfn = eval(attr);
	}
	catch (e) {
		self.app_alert("bad initfn: " + attr, "e");
	}

	if (initfn)
	{
		console.log("### initfn: " + attr, jo.selector);
 		try {
			initfn.apply(jo, paramArr || []);
		} catch (ex) {
			console.error(ex);
			throw(ex);
		}
	}
}

function getModulePath(file)
{
	var url = self.options.moduleExt["showPage"](file);
	if (url)
		return url;
	return self.options.pageFolder + "/" + file;
}

/** 
@fn showPage(pageName, showPageOpt?={title, target, pageFilter}, paramArr?=[showPageOpt])

- pageName: 由page上的class指定。
- showPageOpt.title: 如果未指定，则使用page上的title属性.
- paramArr: 调用initfn时使用的参数，是一个数组。如果不指定，则调用initfn直接传入showPageOpt。推荐不指定该参数。

@alias showPage(pageName, title?, paramArr?)

新页面以title作为id。
注意：每个页面都是根据pages下相应pageName复制出来的，显示在一个新的tab页中。相同的title当作同一页面。
初始化函数由page上的my-initfn属性指定。

page定义示例: 

	<div id="my-pages" style="display:none">
		<div class="pageHome" title="首页" my-initfn="initPageHome"></div>
	</div>

page调用示例:

	WUI.showPage("pageHome");
	WUI.showPage("pageHome", "我的首页"); // 默认标题是"首页"，这里指定显示标题为"我的首页"。

(v5.4) 如果标题中含有"%s"，将替换成原始标题，同时传参到initPage:

	WUI.showPage("pageHome", "%s-" + cityName, [{cityName: cityName}]); //e.g. 显示 "首页-上海"

title用于唯一标识tab，即如果相同title的tab存在则直接切换过去。除非：
(v5.5) 如果标题以"!"结尾, 则每次都打开新的tab页。

## showPageOpt.pageFilter: (v6) 指定列表页过滤条件(PAGE_FILTER)

示例

	var pageFilter = {cond: {status: "在职"}};
	WUI.showPage("pageEmployee", {title: "员工", pageFilter: pageFilter});

它直接影响页面中的datagrid的查询条件。

选项`_pageFilterOnly`用于影响datagrid查询只用page filter的条件。

	var pageFilter = { cond: {status: "在职"}, _pageFilterOnly: true };
	WUI.showPage("pageEmployee", {title: "员工", pageFilter: pageFilter});

注意：旧应用中通过paramArr[1]来指定pageFilter, 目前兼容该用法，但不推荐使用：

	WUI.showPage("pageEmployee", "员工", [null, pageFilter]); // 旧写法，不推荐使用
	// 等价于
	WUI.showPage("pageEmployee", {title: "员工", pageFilter: pageFilter});

## (v6) 返回deferred对象

showPage返回deferred/promise对象，表示页面加载完成。所以如果某些操作要依赖于页面完成，可以用：

	var dfd = WUI.showPage(...);
	dfd.then(fn);
	// fn中的操作需要依赖上面页面。

或

	await WUI.showPage();
	fn();

## showPageOpt.target: 指定显示在哪个tabs中

一般与系统页面pageTab合用，pageTab可显示一个或多个tabs，然后把新页面显示在指定tabs中。示例：

	await WUI.showPage("pageTab", {title: "员工!", tabs:"40%,60%"});
	WUI.showPage("pageEmployee", {title: "管理员", pageFilter:{cond: {perms:"~mgr"}}, target:"员工_1"});
	WUI.showPage("pageEmployee", {title: "非管理员", pageFilter:{cond: {perms:"!~mgr"}}, target:"员工_2"});

注意：下面两个页面target要依赖于pageTab页面，所以需要加await等待pageTab页面加载完成。

@see pageTab
*/
self.showPage = showPage;
function showPage(pageName, title_or_opt, paramArr)
{
	var showPageOpt = {pageName: pageName};
	if ($.isPlainObject(title_or_opt)) {
		$.extend(true, showPageOpt, title_or_opt);
	}
	else {
		showPageOpt.title = title_or_opt;
	}
	if (paramArr == null) {
		paramArr = [showPageOpt];
	}
	// 兼容旧应用，pageFilter=paramArr[1]; 新应用不应再使用
	else if (!showPageOpt.pageFilter && $.isArray(paramArr) && $.isPlainObject(paramArr[1])) {
		showPageOpt.pageFilter = paramArr[1];
	}

	var dfdShowPage = $.Deferred();
	var showPageArgs_ = [pageName, showPageOpt, paramArr];
	var sel = "#my-pages > div." + pageName;
	var jpage = $(sel);
	if (jpage.length > 0) {
		initPage();
	}
	else {
		sel = "#tpl_" + pageName;
		var html = $(sel).html();
		if (html) {
			loadPage(html, pageName, null);
			return dfdShowPage;
		}

		//jtab.append("开发中");

		//self.enterWaiting(); // NOTE: leaveWaiting in initPage
		var pageFile = getModulePath(pageName + ".html");
		$.ajax(pageFile).then(function (html) {
			loadPage(html, pageName, pageFile);
		}).fail(function () {
			//self.leaveWaiting();
		});
	}
	return dfdShowPage;

	function initPage()
	{
		var title0 = jpage.attr("title") || "无标题";
		var title = showPageOpt.title;
		if (title == null)
			title = title0;
		else
			title = title.replace('%s', title0);

		var force = false;
		if (title.substr(-1, 1) == "!") {
			force = true;
			title = title.substr(0, title.length-1);
		}
		showPageOpt.title = title;

		var tt = showPageOpt.target? $("#"+showPageOpt.target): self.tabMain;
		if (tt.tabs('exists', title)) {
			if (!force) {
				tt.tabs('select', title);
				dfdShowPage.resolve();
				return;
			}
			tt.tabs('close', title);
		}

		var id = tabid(title);
		var content = "<div id='" + id + "' title='" + title + "' />";
		var jtab = $(content);
		var closable = (pageName != self.options.pageHome);

		tt.tabs('add',{
	// 		id: id,
			title: title,
			closable: closable,
			fit: true,
			content: jtab
		});

		var jpageNew = jpage.clone().appendTo(jtab);
		jpageNew.addClass('wui-page');
		jpageNew.attr("wui-pageName", pageName);
		jpageNew.attr("title", title);

		var dep = self.evalAttr(jpageNew, "wui-deferred");
		if (dep) {
			self.assert(dep.then, "*** wui-deferred attribute DOES NOT return a deferred object");
			dep.then(initPage1);
			return;
		}
		initPage1();

		function initPage1()
		{
			jpageNew.data("showPageArgs_", showPageArgs_); // used by WUI.reloadPage
			enhancePage(jpageNew);
			$.parser.parse(jpageNew); // easyui enhancement
			self.enhanceWithin(jpageNew);
			callInitfn(jpageNew, paramArr);

			jpageNew.trigger('pagecreate');
			jpageNew.trigger('pageshow');
			dfdShowPage.resolve();
		}
	}

	function loadPage(html, pageClass, pageFile)
	{
		// 放入dom中，以便document可以收到pagecreate等事件。
		var jcontainer = $("#my-pages");
	// 	if (m_jstash == null) {
	// 		m_jstash = $("<div id='muiStash' style='display:none'></div>").appendTo(self.container);
	// 	}
		// 注意：如果html片段中有script, 在append时会同步获取和执行(jquery功能)
		jpage = $(html).filter("div");
		if (jpage.size() > 1 || jpage.size() == 0) {
			console.log("!!! Warning: bad format for page '" + pageClass + "'. Element count = " + jpage.size());
			jpage = jpage.filter(":first");
		}

		// 限制css只能在当前页使用
		jpage.find("style").each(function () {
			$(this).html( self.ctx.fixPageCss($(this).html(), "." + pageClass) );
		});
		// bugfix: 加载页面页背景图可能反复被加载
		jpage.find("style").attr("wui-origin", pageClass).appendTo(document.head);

/**
@key wui-pageFile

动态加载的逻辑页(或对话框)具有该属性，值为源文件名。
*/
		jpage.attr("wui-pageFile", pageFile);
		jpage.addClass(pageClass).appendTo(jcontainer);

		var val = jpage.attr("wui-script");
		if (val != null) {
			var path = getModulePath(val);
			var dfd = mCommon.loadScript(path, initPage);
			dfd.fail(function () {
				self.app_alert("加载失败: " + val);
				self.leaveWaiting();
				//history.back();
			});
		}
		else {
			initPage();
		}
	}
}

// (param?, ignoreQueryParam?=false)  param优先级最高，会返回新对象，不改变param 
function getDgFilter(jtbl, param, ignoreQueryParam)
{
	var p1, p2;
	var p3 = getPageFilter(jtbl.closest(".wui-page"));
	if (p3 && p3._pageFilterOnly) {
		p3 = $.extend(true, {}, p3); // 复制一份
		delete p3._pageFilterOnly;
	}
	else {
		var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
		var dgOpt = jtbl[datagrid]("options");
		var p1 = dgOpt.url && dgOpt.url.params;
		if (p1)
			delete p1._app;
		var p2 = !ignoreQueryParam && dgOpt.queryParams;
	}
	return self.extendQueryParam({}, p1, p2, p3, param);
}

/**
@fn getPageFilter(jpage, name?)
@key PAGE_FILTER

取页面的过滤参数，由框架自动处理.
返回showPage原始过滤参数或null。注意不要修改它。

如果指定name，则取page filter中的该过滤字段的值。示例：假如page filter有以下4种：

	{ cond: { type: "A" }}
	{ cond: "type='A'"}
	{ cond: {type: "A OR B"} }
	{ cond: {type: "~A*"} }

则调用getPageFilter(jpage, "type")时，仅当第1种才返回"A"；
其它几种的cond值要么不是对象，要么不是相等条件，均返回null。

*/
self.getPageFilter = getPageFilter;
function getPageFilter(jpage, name)
{
	var showPageArgs = jpage.data("showPageArgs_");
	// showPage(0:pageName, 1:opt={pageName, title, pageFilter?}, 2:paramArr?);  e.g. WUI.showPage(pageName, {title: "title", pageFilter: {cond:cond}})
	if (showPageArgs && $.isPlainObject(showPageArgs[1].pageFilter)) {
		var ret = showPageArgs[1].pageFilter;
		if (name) {
			ret = $.isPlainObject(ret.cond)? ret.cond[name]: null;
			if (! isFixedField(ret))
				ret = null;
		}
		return ret;
	}
}

// 对于页面中只有一个datagrid的情况，铺满显示，且工具栏置顶。
function enhancePage(jpage)
{
	var o = jpage[0].firstElementChild;
	if (o && o.tagName == "TABLE" && jpage[0].children.length == 1) {
		if (o.style.height == "" || o.style.height == "auto")
			o.style.height = "100%";
	}
}

function enhanceDialog(jdlg)
{
	// tabs, datagrid宽度自适应, resize时自动调整
	jdlg.find(".easyui-tabs, .wui-subobj>table").each(function () {
		if (!this.style.width)
			this.style.width = "100%";
	});
	// 如果td直接下面的某项设置有required属性，则自动在该项标题td上加required类（标记"*"表示必填）
	jdlg.find("td>[required]").each(function () {
		$(this).parent().prev("td").addClass("required");
	});
}

/**
@fn saveDlg(jdlg, noCloseDlg=false)

对话框保存，相当于点击确定按钮。如果noCloseDlg=true，则不关闭对话框（即“应用”保存功能）。
 */
self.saveDlg = saveDlg;
self.noCloseDlg = false;
function saveDlg(jdlg, noCloseDlg)
{
	if (noCloseDlg) {
		self.noCloseDlg = true;
		setTimeout(function () {
			self.noCloseDlg = false;
		}, 2000); // 一般2s内保存完毕
	}
	// 点击确定按钮
	jdlg.next(".dialog-button").find("#btnOk").click();
}

/**
@fn closeDlg(jdlg) 
*/
self.closeDlg = closeDlg;
function closeDlg(jdlg)
{
	if (self.noCloseDlg)
		return;
	jdlg.dialog("close");
}

function openDlg(jdlg)
{
	jdlg.dialog("open");
// 	jdlg.find("a").focus(); // link button
}

function focusDlg(jdlg)
{
	var jo;
	jdlg.find(":input[type!=hidden]").each(function (i, o) {
		var jo1 = $(o);
		if (! jo1.prop("disabled") && ! jo1.prop("readonly")) {
			jo = jo1;
			return false;
		}
	});
	if (jo == null) 
		jo = jdlg.find("a button");

	// !!!! 在IE上常常focus()无效，故延迟做focus避免被别的obj抢过
	if (jo)
		setTimeout(function(){jo.focus()}, 50);
}

// setup "Enter" and "Cancel" key for OK and Cancel button on the dialog
$.fn.okCancel = function (fnOk, fnCancel) {
	this.unbind("keydown").keydown(function (e) {
		if (e.keyCode == 13 && e.target.tagName != "TEXTAREA" && fnOk) {
			// NOTE: 部分组件(如jsoneditor)上修改值后，仅在失去焦点时方可取到值。
			$(e.target).blur().focus();
			fnOk();
			return false;
		}
		else if (e.keyCode == 27 && fnCancel) {
			fnCancel();
			return false;
		}
		// Ctrl-F: find mode
		else if ((e.ctrlKey||e.metaKey) && e.which == 70)
		{
			showObjDlg($(this), FormMode.forFind, $(this).data("objParam"));
			return false;
		}
		// Ctrl-D: duplicate
		else if ((e.ctrlKey||e.metaKey) && e.which == 68)
		{
			dupDlg($(this));
			return false;
		}
/* // Ctrl-A: add mode
		else if ((e.ctrlKey||e.metaKey) && e.which == 65)
		{
			showObjDlg($(this), FormMode.forAdd, null);
			return false;
		}
*/
	});
}

/**
@fn dupDlg(jdlg)

复制并添加对象。
对象对话框在更新模式下，按Ctrl-D可复制当前对象，进入添加模式。

支持对子表进行复制，注意仅当子表是允许添加的才会被复制（wui-subobj组件，且设置了valueField和dlg选项）。
TODO 由于子表支持懒加载，目前有个限制，如果子表尚未加载则无法复制；可手工点击tab页让它加载才能复制。

@key event-duplicate(ev, data) 对话框上复制添加对象

如果要定制添加行为，可在对话框的duplicate事件中修改数据。示例：

	jdlg.on("duplicate", function (ev, data) {
		// 可修改data, 若有子表则是数组字段
		// 主表id，子表id及关联主表的id将会自动删除，此处无须处理
		console.log(data);
	});

 */
self.dupDlg = dupDlg;
function dupDlg(jdlg)
{
	var formMode = jdlg.jdata().mode;
	if (formMode != FormMode.forSet)
		return false;

	var data = $.extend(true, {}, jdlg.data("origin_"));
	jdlg.find(".wui-subobj").each(function () {
		var jsub = $(this);
		var subOpt = WUI.getOptions(jsub);
		var isLoaded = jsub.data("subobjLoaded_"); // TODO: 懒加载的subobj，如何取数据？
		// 有valueField和dlg属性的子表才能添加
		if (! (subOpt.valueField && subOpt.dlg && subOpt.dgCall && isLoaded && subOpt.relatedKey))
			return;

		// 典型主子表，设置有关联字段的可以复制
		var ms = subOpt.relatedKey.match(/^([^=]+)=/);
		if (! ms)
			return;
		var relatedKey = ms[1];

		var rows = subOpt.dgCall("getData").rows; // 就是jtbl.datagrid("getData")
		data[subOpt.valueField] = rows;

		setTimeout(function (ev) {
			var rows1 = data[subOpt.valueField];
			if (! $.isArray(rows1))
				return;
			rows1.forEach (function (e) {
				delete e.id;
				delete e[relatedKey];
			});
			subOpt.dgCall("loadData", rows);
		}, 50);
	});

	// 可插入自定义逻辑
	jdlg.trigger("duplicate", [data]);
	delete data.id;

	WUI.showObjDlg(jdlg, FormMode.forAdd, {
		data: data
	});
}

/**
@fn isSmallScreen

判断是否为手机小屏显示. 宽度低于640当作小屏处理.
*/
self.isSmallScreen = isSmallScreen;
function isSmallScreen() {
	return $(document.body).width() < 640;
}
if (isSmallScreen()) {
	$('<meta name="viewport" content="width=device-width, initial-scale=0.8, maximum-scale=0.8">').appendTo(document.head);
}

/**
@fn showDlg(jdlg, opt?)

@param jdlg 可以是jquery对象，也可以是selector字符串或DOM对象，比如 "#dlgOrder".
注意：当对话框动态从外部加载时，jdlg=$("#dlgOrder") 一开始会为空数组，这时也可以调用该函数，且调用后jdlg会被修改为实际加载的对话框对象。

@param opt?={url, buttons, noCancel=false, okLabel="确定", cancelLabel="取消", modal=true, reset=true, validate=true, data, onOk, onSubmit, title}

- opt.url: String. 点击确定后，提交到后台的URL。如果设置则自动提交数据，否则应在opt.onOk回调或validate事件中手动提交。
- opt.buttons: Object数组。用于添加“确定”、“取消”按钮以外的其它按钮，如`[{text: '下一步', iconCls:'icon-ok', handler: btnNext_click}]`。
 用opt.okLabel/cancelLabel可修改“确定”、“取消”按钮的名字，用opt.noCancel=true可不要“取消”按钮。
- opt.modal: Boolean.模态对话框，这时不可操作对话框外其它部分，如登录框等。设置为false改为非模态对话框。
- opt.data: Object. 自动加载的数据, 将自动填充到对话框上带name属性的DOM上。(v6.0) 与opt.forSet一起使用时，在修改对象时，仅当与opt.data有差异的数据才会传到服务端。
- opt.reset: Boolean. 显示对话框前先清空。默认为true.
- opt.validate: Boolean. 是否提交前用easyui-form组件验证数据。内部使用。
- opt.onSubmit: Function(data) 自动提交前回调。用于验证或补齐提交数据，返回false可取消提交。opt.url为空时不回调。
- opt.onOk: Function(jdlg, data?) 如果自动提交(opt.url非空)，则服务端接口返回数据后回调，data为返回数据。如果是手动提交，则点确定按钮时回调，没有data参数。
	(v6.0) 如果onOk设置为'close'，则显示操作成功并关闭对话框。
- opt.title: String. 如果指定，则更新对话框标题。
- opt.dialogOpt: 底层jquery-easyui dialog选项。参考http://www.jeasyui.net/plugins/159.html
- opt.reload: (v5.5) 先重置再加载。只用于开发环境，方便在Chrome控制台中调试。
- opt.meta: (v6) 指定通过meta自动生成的输入项
- opt.metaParent: (v6) 指定meta自动生成项的父结点，默认为对话框下第一个table，仅当meta存在时有效
- opt.forSet: (v6.0) 与opt.data一起使用，设置为true表示只提交修改的数据。
- opt.onShow: (v6.0) Function(formMode, data) 显示时回调

如果是对象对话框（showObjDlg）调用过来，会自动带上以下选项：

- opt.mode: formMode
- opt.jtbl: 绑定的数据表(可能为空)

## 对话框加载

示例1：静态加载（在web/store.html中的my-pages中定义），通过对话框的id属性标识。

	<div id="my-pages" style="display:none">
		<div id="dlgLogin" title="商户登录">  
			...
		</div>
	<div>

加载：`WUI.showDlg($("#dlgLogin"))`。对话框顶层DOM用div或form都可以。用form更简单些。
除了少数内置对话框，一般不建议这样用，而是建议从外部文件动态加载（模块化）。

示例2：从内部模板动态加载，模板id须为"tpl_{对话框id}"，对话框上不用指定id

	<script type="text/template" id="tpl_dlgLogin">
		<div title="商户登录">  
			...
		</div>
	</script>

加载：`WUI.showDlg($("#dlgLogin"))`或`WUI.showDlg("#dlgLogin")`。
比示例1要好些，但一般也不建议这样用。目前是webcc编译优化机制使用该技术做发布前常用对话框的合并压缩。

示例3：从外部模板动态加载，模板是个文件如web/page/dlgLogin.html，对话框上不用指定id

	<div title="商户登录">  
		...
	</div>

加载：`WUI.showDlg($("#dlgLogin"))`或`WUI.showDlg("#dlgLogin")`。
这是目前使用对话框的主要方式。

示例4：不用HTML，直接JS中创建DOM：

	var jdlg = $('<div title="商户登录">Hello World</div>');
	WUI.showDlg(jdlg);

适合编程动态实现的对话框。参考使用更简单的WUI.showDlgByMeta或WUI.showDlg的meta选项。

## 对话框编程模式

对话框有两种编程模式，一是通过opt参数在启动对话框时设置属性及回调函数(如onOk)，另一种是在dialog初始化函数中处理事件(如validate事件)实现逻辑，有利于独立模块化。

对话框显示时会触发以下事件：

	事件beforeshow
	事件show

对于自动提交数据的对话框(设置了opt.url)，提交数据过程中回调函数及事件执行顺序为：

	事件validate; // 提交前，用于验证或设置提交数据。返回false或ev.preventDefault()可取消提交，中止以下代码执行。
	opt.onSubmit.call(jdlg, data); // 提交前，验证或设置提交数据，返回false将阻止提交。
	... 框架通过callSvr自动提交数据，如添加、更新对象等。
	opt.onOk(data); // 提交且服务端返回数据后。回调函数中this为对话框jdlg, data是服务端返回数据。
	事件retdata; // 与onOk类似。

对于手动提交数据的对话框(opt.url为空)，执行顺序为：

	事件validate; // 用于验证、设置提交数据、提交数据。
	opt.onOk(); // 同上. 回调函数中this为jdlg.

注意：

- 参数opt可在beforeshow事件中设置，这样便于在对话框模块中自行设置选项，包括okLabel, onOk回调等等。
- 旧版本中的回调 opt.onAfterSubmit() 回调已删除，请用opt.onOk()替代。

调用此函数后，对话框将加上以下CSS Class:
@key .wui-dialog 标识WUI对话框的类名。

示例：显示一个对话框，点击确定后调用后端接口。

	WUI.showDlg("#dlgCopyTo", {
		modal: false, 
		reset: false,
		url: WUI.makeUrl("Category.copyTo", {cond: ...}),
		onSubmit: ..., // 提交前验证，返回False则取消提交
		onOk: function (retdata) {
			var jdlgCopyTo = this; // this是当前对话框名
			// 自动提交后处理返回数据retdata
		}
	});

- 在对话框HTML中以带name属性的输入框作为参数，如`用户名:<input name="uname">`.
- 默认为模态框(只能操作当前对话框，不能操作页面中其它组件)，指定modal:false使它成为非模态；
- 默认每次打开都清空数据，指定reset:false使输入框保留初值或上次填写内容。
- 设置了url属性，点击确定自动提交时相当于调用`callSvr(url, 回调onOk(retdata), POST内容为WUI.getFormData(dlg))`。

如果不使用url选项，也可实现如下：

	WUI.showDlg("#dlgCopyTo", {
		modal: false, 
		reset: false,
		onOk: function () {
			var jdlgCopyTo = this; // this是当前对话框名
			var data = WUI.getFormData(jdlgCopyTo);
			callSvr("Category.copyTo", {cond: ...}, function (retdata) { ... }, data);
		}
	});

如果要做更多的初始化配置，比如处理对话框事件，则使用初始化函数机制，即在对话框DOM上设置`my-initfn`属性：

	<div title="复制到" my-initfn="initDlgCopyTo"> ... </div>

初始化函数示例：

	function initDlgCopyTo()
	{
		var jdlg = $(this);

		jdlg.on("beforeshow", onBeforeShow)
			.on("validate", onValidate);

		function onBeforeShow(ev, formMode, opt) {
		}
		function onValidate(ev, mode, oriData, newData) {
		}
	}

## 对象型对话框与formMode

函数showObjDlg()会调用本函数显示对话框，称为对象型对话框，用于对象增删改查，它将以下操作集中在一起。
打开窗口时，会设置窗口模式(formMode):

- 查询(FormMode.forFind)
- 显示及更新(FormMode.forSet)
- 添加(FormMode.forAdd)
- 删除(FormMode.forDel)，但实际上不会打开对话框

注意：

- 可通过`var formMode = jdlg.jdata().mode;`来获取当前对话框模式。
- 非对象型对话框的formMode为空。
- 对象型对话框由框架自动设置各opt选项，一般不应自行修改opt，而是通过处理对话框事件实现逻辑。

初始数据与对话框中带name属性的对象相关联，显示对话框时，带name属性的DOM对象将使用数据opt.data自动赋值(对话框show事件中可修改)，在点“确定”按钮提交时将改动的数据发到服务端(validate事件中可修改)，详见
@see setFormData,getFormData

## 对话框事件

操作对话框时会发出以下事件供回调：

	create - 对话框创建（在my-initfn执行后）
	beforeshow - 对话框显示前。常用来处理对话框显示参数opt或初始数据opt.data.
	show - 显示对话框后。常用来设置字段值或样式，隐藏字段、初始化子表datagrid或隐藏子表列等。
	validate - 用于提交前验证、补齐数据等。返回false可取消提交。(v5.2) 支持其中有异步操作.
	retdata - 服务端返回结果时触发。用来根据服务器返回数据继续处理，如再次调用接口。

注意：

- 旧版本中的initdata, loaddata, savedata将废弃，应分别改用beforeshow, show, validate事件替代，注意事件参数及检查对话框模式。

@key event-create(ev)
对话框初始化函数执行后触发。

@key event-beforeshow(ev, formMode, opt)
显示对话框前触发。

- opt参数即showDlg的opt参数，可在此处修改，例如修改opt.title可以设置对话框标题。
- opt.objParam参数是由showObjDlg传入给dialog的参数，比如opt.objParam.obj, opt.objParam.formMode等。
- 通过修改opt.data可为字段设置缺省值。注意forFind模式下opt.data为空。
- 可以通过在beforeshow中用setTimeout延迟执行某些动作，这与在show事件中回调操作效果基本一样。
- (v6) 设置opt.cancel=true可取消显示对话框.

注意：每次调用showDlg()都会回调，可能这时对话框已经在显示。

@key event-show(ev, formMode, initData)
对话框显示后事件，用于设置DOM组件。
注意如果在beforeshow事件中设置DOM，对于带name属性的组件会在加载数据时值被覆盖回去，对它们在beforeshow中只能通过设置opt.data来指定缺省值。

@key event-validate(ev, formMode, initData, newData)
initData为初始数据，如果要验证或修改待提交数据，应直接检查form中相应DOM元素的值。如果需要增加待提交字段，可加到newData中去。示例：添加参数: newData.mystatus='CR';

(v5.2) validate事件支持返回Deferred对象支持异步操作.
示例: 在提交前先弹出对话框询问. 由于app_alert是异步对话框, 需要将一个Deferred对象放入ev.dfds数组, 告诉框架等待ev.dfds中的延迟对象都resolve后再继续执行.

	jdlg.on("validate", onValidate);
	function onValidate(ev, mode, oriData, newData) 
	{
		var dfd = $.Deferred();
		app_alert("确认?", "q", function () {
			console.log("OK!");
			dfd.resolve();
		});
		ev.dfds.push(dfd.promise());
	}

常用于在validate中异步调用接口(比如上传文件).

@key event-retdata(ev, data, formMode)
form提交后事件，用于处理返回数据

以下事件将废弃：
@key event-initdata(ev, initData, formMode) 加载数据前触发。可修改要加载的数据initData, 用于为字段设置缺省值。将废弃，改用beforeshow事件。
@key event-loaddata(ev, initData, formMode) form加载数据后，一般用于将服务端数据转为界面显示数据。将废弃，改用show事件。
@key event-savedata(ev, formMode, initData) 对于设置了opt.url的窗口，将向后台提交数据，提交前将触发该事件，用于验证或补足数据（修正某个）将界面数据转为提交数据. 返回false或调用ev.preventDefault()可阻止form提交。将废弃，改用validate事件。

@see example-dialog-event 在对话框中使用事件

## reset控制

对话框上有name属性的组件在显示对话框时会自动清除（除非设置opt.reset=false或组件设置有noReset属性）。

@key .my-reset 标识在显示对话框时应清除
对于没有name属性（不与数据关联）的组件，可加该CSS类标识要求清除。
例如，想在forSet模式下添加显示内容, 而在forFind/forAdd模式下时清除内容这样的需求。

	<div class="my-reset">...</div>

@key [noReset]
某些字段希望设置后一直保留，不要被清空，可以设置noReset属性，例如：

	<input type="hidden" name="status" value="PA" noReset>

## 控制底层jquery-easyui对话框

wui-dialog可以使用底层easyui-dialog/easyui-window/easyui-panel的选项或方法，参考：

- easyui-dialog: https://www.jeasyui.net/plugins/181.html
- easyui-window: https://www.jeasyui.net/plugins/180.html
- easyui-pandel: https://www.jeasyui.net/plugins/159.html

示例：打开时最大化，关闭对话框时回调事件：

	var dialogOpt = {  
		maximized: true,
		onClose:function(){
			console.log("close");
		}  
	};

	jfrm.on("beforeshow",function(ev, formMode, opt) {
		opt.dialogOpt = dialogOpt;
	})

(v6) 除了直接指定opt.dialogOpt，还可以直接通过data-options来设置，示例：
不显示折叠、最大化按钮，自定义类名"loginPanel"

	<div id="dlgLogin" title="登录" data-options="cls:'loginPanel',collapsible:false,maximizable:false" style="width:350px;height:210px;">  
	...
	</div>

## 复用dialog模板

(v5.3引入，v6修改) 该机制可用于自定义表(UDT, 对话框动态生成)。

如 dlgUDT_inst_A 与 dlgUDT_inst_B 会共用dlgUDT对话框模板，只要用"_inst_"分隔对话框模板文件和后缀名。

	WUI.showDlg("dlgUDT_inst_A"); // 自动加载page/dlgUDT.html文件

若涉及重用其它模块中的页面或对话框，请参考 WUI.options.moduleExt

## 动态生成字段的对话框

(v6) 该机制可用于为已有对话框动态追加字段（比如用于用户自定义字段UDF)，或是只用纯JS而不用html来创建对话框。

示例：为对话框dlgReportCond追加两个输入字段。

	var itemArr = [
		// title, dom, hint?
		{title: "状态", dom: '<select name="status" class="my-combobox" data-options="jdEnumMap:OrderStatusMap"></select>'},
		{title: "订单号", dom: "<textarea name='param' rows=5></textarea>", hint: '每行一个订单号'}
	];
	WUI.showDlg("#dlgReportCond", {
		meta: itemArr,
		onOk: function (data) {
			console.log(data)
		},
		// metaParent: "table:first" // 也可指定插入点父结点
	});

通过指定opt.meta动态生成字段，这些字段默认放置于对话框中的第一个table下。
一般详情对话框DOM模型均为"<form><table></table></form>"。

注意由于对话框有id，只会创建一次。之后再调用也不会再创建。如果希望能创建多的对话框互不影响，可以用"#dlgReportCond_inst_A"这种方式指定是用它的一个实例。

示例2：动态创建一个登录对话框

	var jdlg = $('<form title="商户登录"><table></table></form>');
	var meta = [
		{title: "用户名", dom: '<input name="uname" class="easyui-validatebox" required>', hint: "字母开头或11位手机号"},
		{title: "密码", dom: '<input type="password" name="pwd" class="easyui-validatebox" required>'}
	];
	WUI.showDlg(jdlg, {
		meta: meta,
		onOk: function (data) {
			console.log(data); // 根据meta中每个带name项的输入框生成：{uname, pwd}
			callSvr("login", function () {
				app_show("登录成功");
				WUI.closeDlg(jdlg);
			}, data);
		}
	});

可以没有title/dom，只用hint用于逻辑说明，示例:

	var meta = [
		{hint:'查询<code>工单实际开工日期</code>在指定日期区间的所有受EC到影响的工件'},
		{title: "序列号", dom: '<input name="code">'},
		...
	];
	WUI.showDlg("#dlgReportCond", {
		meta: meta,
		onOk: function (data) { ... }
	});

@see showDlgByMeta
@see showObjDlg
*/
self.showDlg = showDlg;
function showDlg(jdlg, opt) 
{
	if (jdlg.constructor != jQuery)
		jdlg = $(jdlg);

	if (opt && opt.reload) {
		opt = $.extend({}, opt);
		delete opt.reload;
		if (jdlg.size() > 0) {
			unloadDialog(jdlg);
			if (! jdlg.attr("id"))
				return;
			jdlg = $("#" + jdlg.attr("id"));
		}
	}
	if (loadDialog(jdlg, onLoad, opt))
		return;
	function onLoad() {
		jdlg.trigger('create');
		showDlg(jdlg, opt);
	}

	var formMode = opt && opt.mode;
	opt = $.extend({
		okLabel: "确定",
		cancelLabel: "取消",
		noCancel: false,
		modal: opt && opt.noCancel,
		reset: true,
		validate: true,
		forSet: (formMode == FormMode.forSet),
		data: {}
	}, opt);

	jdlg.addClass('wui-dialog');
	callInitfn(jdlg, [opt]);

	if (opt.fixedFields)
		$.extend(opt.data, opt.fixedFields);

	// TODO: 事件换成jdlg触发，不用jfrm。目前旧应用仍使用jfrm监听事件，暂应保持兼容。
	var jfrm = jdlg.is("form")? jdlg: jdlg.find("form:first");
	jfrm.trigger("beforeshow", [formMode, opt]);
	if (opt.cancel)
		return;

	var btns = [{id: "btnOk", text: opt.okLabel, iconCls:'icon-ok', handler: fnOk}];
	if (! opt.noCancel) 
		btns.push({id: "btnCancel", text: opt.cancelLabel, iconCls:'icon-cancel', handler: fnCancel})
	if ($.isArray(opt.buttons))
		btns.unshift.apply(btns, opt.buttons);

	var small = self.isSmallScreen();
	var dlgOpt = $.extend({
//		minimizable: true,
		maximizable: !small,
		collapsible: !small,
		resizable: !small,

		// reset default pos.
		left: null,
		top: null,

		closable: ! opt.noCancel,
		modal: opt.modal,
		buttons: btns,
		title: opt.title
	}, opt.dialogOpt, WUI.getOptions(jdlg));
	if (jdlg.is(":visible")) {
		dlgOpt0 = jdlg.dialog("options");
		$.extend(dlgOpt, {
			left: dlgOpt0.left,
			top: dlgOpt0.top
		});
	}
	// 禁用阴影，避开自适应高度时显示问题
	var h = jdlg[0].style.height;
	if (h == "" || h == "auto") {
		dlgOpt.shadow = false;
	}

	jdlg.dialog(dlgOpt);
	var perm = jdlg.attr("wui-perm") || jdlg.dialog("options").title;
	jdlg.toggleClass("wui-readonly", (opt.objParam && opt.objParam.readonly) || !self.canDo(perm, "对话框") || (formMode==FormMode.forSet && !self.canDo(perm, "修改")) );

	jdlg.okCancel(fnOk, opt.noCancel? undefined: fnCancel);

	if (opt.reset)
	{
		mCommon.setFormData(jdlg); // reset
		// !!! NOTE: form.reset does not reset hidden items, which causes data is not cleared for find mode !!!
		// jdlg.find("[type=hidden]:not([noReset])").val(""); // setFormData可将hidden清除。
		jdlg.find(".my-reset").empty();
	}
	if (opt.data && opt.reset)
	{
		jfrm.trigger("initdata", [opt.data, formMode]); // TODO: remove. 用beforeshow替代。
		//jfrm.form("load", opt.data);
		mCommon.setFormData(jdlg, opt.data, {setOrigin: opt.forSet});
		jfrm.trigger("loaddata", [opt.data, formMode]); // TODO: remove。用show替代。
// 		// load for jquery-easyui combobox
// 		// NOTE: depend on jeasyui implementation. for ver 1.4.2.
// 		jfrm.find("[comboname]").each (function (i, e) {
// 			$(e).combobox('setValue', opt.data[$(e).attr("comboname")]);
// 		});
	}

	// 含有固定值的对话框，根据opt.fixedFields[fieldName]填充值并设置只读.
	setFixedFields(jdlg, opt);

// 	openDlg(jdlg);
	focusDlg(jdlg);
	jfrm.trigger("show", [formMode, opt.data]);

	opt.onShow && opt.onShow(formMode, opt.data);

	function fnCancel() {closeDlg(jdlg)}
	function fnOk()
	{
		if (jdlg.hasClass("wui-readonly") && formMode!=FormMode.forFind) { // css("pointer-events") == "none"
			closeDlg(jdlg);
			return;
		}

		var ret = true;
		if (opt.validate) {
			// 隐藏的组件不验证
			var jo = jfrm.find(".validatebox-text:hidden").filter(function () {
				var ji = $(this);
				return ji.css("display") == "none" || ji.closest("tr,.wui-field").css("display") == "none";
			});
			jo.validatebox("disableValidation");
			ret = jfrm.form("validate");
			jo.validatebox("enableValidation");
		}
		if (! ret) {
			var ji = jfrm.find(".validatebox-invalid:first");
			var vb = ji.data("validatebox");
			if (vb && vb.message && ji.is(":hidden,[readonly],:disabled")) {
				// 可能隐藏在某Tab页中，应切换过去，避免点确定按钮无反应
				var it = ji.gn();
				var code = "验证失败: <br><span style='color:red'>字段\"" + it.getTitle() + "\": " + vb.message + '</span>';
				app_alert(code, "w", function () {
					it.setFocus();
				});
			}
			return false;
		}

		var newData = {};
		var dfd = self.triggerAsync(jfrm, "validate", [formMode, opt.data, newData]);
		if (dfd === false)
			return false;
		dfd.then(afterValidate);

		function afterValidate() {
			// TODO: remove. 用validate事件替代。
			var ev = $.Event("savedata");
			jfrm.trigger(ev, [formMode, opt.data]);
			if (ev.isDefaultPrevented())
				return false;

			var data = formMode != FormMode.forFind? mCommon.getFormData(jdlg): getFindData(jdlg);
			$.extend(data, newData);

/*
			// 新的验证接口，不支持异步
			var ev = $.Event("validate2");
			jfrm.trigger(ev, [formMode, data]);
			if (ev.isDefaultPrevented())
				return false;
*/
			if (opt.url) {
				// 没有更新时直接关闭对话框
				if (opt.forSet) {
					if ($.isEmptyObject(data)) {
						closeDlg(jdlg);
						return false;
					}
				}
				if (opt.onSubmit && opt.onSubmit.call(jdlg, data) === false)
					return false;

				var m = opt.url.action.match(/\.(add|set|del)$/);
				if (m) {
					var cmd = {add: "新增", set: "修改", del: "删除"}[m[1]];
					if (!self.canDo(perm, cmd)) {
						app_alert("无权限操作! 本操作需要权限：" + perm + "." + cmd, "w");
						throw "abort";
					}
				}
				// 批量更新
				if (formMode==FormMode.forSet && opt.url.action && /.set$/.test(opt.url.action)) {
					if ($.isEmptyObject(data)) {
						app_alert("没有需要更新的内容。");
						return;
					}
					var jtbl = jdlg.jdata().jtbl;
					var obj = opt.url.action.replace(".set", "");
					var rv = batchOp(obj, obj+".setIf", jtbl, {
						acName: "更新",
						data: data, 
						offline: opt.offline,
						onBatchDone: function () {
							// TODO: onCrud();
							closeDlg(jdlg);
						}
					});
					if (rv !== false)
						return;
				}
				self.callSvr(opt.url, function (retData) {
					success(data, retData);
				}, data);
			}
			else {
				success(data, data);
			}
			// opt.onAfterSubmit && opt.onAfterSubmit(jfrm); // REMOVED
		}

		function success (reqData, retData)
		{
			if (opt.data) // 更新对话框的原始数据
				$.extend(opt.data, reqData);
			if (opt.onOk) {
				jfrm.trigger('retdata', [retData, formMode]);
				if (opt.onOk === 'close') {
					app_show("操作成功!");
					WUI.closeDlg(jdlg);
				}
				else {
					opt.onOk.call(jdlg, retData);
				}
			}
		}
	}
}

/**
@fn showDlgByMeta(meta, opt)

WUI.showDlg的简化版本，通过直接指定组件创建对话框。返回动态创建的jdlg。

- meta: [{title, dom, hint?}]
- opt: 同showDlg的参数

示例：

	var itemArr = [
		// title, dom, hint?
		{title: "接口名", dom: "<input name='ac' required>", hint: "示例: Ordr.query"},
		{title: "参数", dom: "<textarea name='param' rows=5></textarea>", hint: '示例: {cond: {createTm: ">2020-1-1"}, res: "count(*) cnt", gres: "status"}'}
	];
	WUI.showDlgByMeta(meta, {
		title: "通用查询",
		modal: false,
		onOk: function (data) {
			app_alert(JSON.stringify(data));
		}
	});

@see showDlg 参考opt.meta选项
 */
self.showDlgByMeta = showDlgByMeta;
function showDlgByMeta(itemArr, opt)
{
	var jdlg = $("<form><table></table></form>");
	if (! opt)
		opt = {};
	opt.meta = itemArr;
	self.showDlg(jdlg, opt);
	return jdlg;
}

/* 外部可扩展UDF
var myUdf = {
	prototype: WUI.UDF,
	onGetMeta(obj) {
		... 
	},
	addFieldByMeta: function (jdlg, jtbl, meta) {
		if (...) {
		}
		this.prototype.addFieldByMeta(meta);
	}
}
WUI.UDF = myUDF;
 */
self.UDF = {
	onGetMeta: function (obj) {
	},
	addFieldByMeta: addFieldByMeta,
	addColByMeta: function (columns) {
	}
};

function addFieldByMeta(jdlg, jp, itemArr)
{
	var code = '';
	for (var i=0; i<itemArr.length; ++i) {
		var item = itemArr[i];
		var hint = '';
		if (item.hint)
			hint = "<p class=\"hint\">" + item.hint + "</p>";
		code += "<tr><td>" + (item.title||'') + "</td><td>" + (item.dom||'') + hint + "</td></tr>";
	}
	if (code) {
		$(code).appendTo(jp);
		$.parser.parse(jp); // easyui enhancement
		self.enhanceWithin(jp);
	}
}

// 按住Ctrl/Command键进入批量模式。
var tmrBatch_;
$(document).keydown(function (e) {
	if (e.ctrlKey || e.metaKey) {
		m_batchMode = true;
		clearTimeout(tmrBatch_);
		tmrBatch_ = setTimeout(function () {
			m_batchMode = false;
			tmrBatch_ = null;
		},500);
	}
});
$(window).keyup(function (e) {
	if (e.ctrlKey || e.metaKey) {
		m_batchMode = false;
		clearTimeout(tmrBatch_);
	}
});

/**
@fn batchOp(obj, ac, jtbl, opt={data, acName="操作", onBatchDone, batchOpMode=0, queryParam})

基于列表的批量处理逻辑：(v6支持基于查询条件的批量处理逻辑，见下面opt.queryParam)

对表格jtbl中的多选数据进行批量处理，先调用`$obj.query(cond)`接口查询符合条件的数据条数（cond条件根据jtbl上的过滤条件及当前多选项自动得到），弹出确认框(`opt.acName`可定制弹出信息)，
确认后调用`ac(cond)`接口对多选数据进行批量处理，处理完成后回调`opt.onBatchDone`，并刷新jtbl表格。

其行为与框架内置的批量更新、批量删除相同。

@param ac 对象接口名, 如"Task.setIf"/"Task.delIf"，也可以是函数接口，如"printSn"

@param opt.acName 操作名称, 如"更新"/"删除"/"打印"等, 一个动词. 用于拼接操作提示语句.

@param opt.data  调用支持批量的接口的POST参数

opt.data也可以是一个函数dataFn(batchCnt)，参数batchCnt为当前批量操作的记录数(必定大于0)。
该函数返回data或一个Deferred对象(该对象适时应调用dfd.resolve(data)做批量操作)。dataFn返回false表示不做后续处理。

@return 如果返回false，表示当前非批量操作模式，或参数不正确无法操作。

为支持批量操作，服务端须支持以下接口:

	// 对象obj的标准查询接口:
	$obj.query($queryParam, res:"count(*) cnt") -> {cnt}
	// 批量操作接口ac, 接受过滤查询条件(可通过$obj.query接口查询), 返回实际操作的数量.
	$ac($queryParam)($data) -> $cnt

其中obj, ac, data(即POST参数)由本函数参数传入(data也可以是个函数, 返回POST参数), queryParam根据表格jtbl的选择行或过滤条件自动生成.

基于列表的批量操作，完成时会自动刷新表格, 无须手工刷新. 在列表上支持以下批量操作方式:

1. 基于多选: 按Ctrl/Shift在表上选择多行，然后点操作按钮(如"删除"按钮, 更新时的"确定"按钮)，批量操作选中行；生成过滤条件形式是`{cond: "id IN (100,101)"}`, 

2. 基于表格当前过滤条件: 按住Ctrl键(进入批量操作模式)点操作按钮, 批量操作表格过滤条件下的所有行. 若无过滤条件, 自动以`{cond: "id>0"}`做为过滤条件.

3. 如果未按Ctrl键, 且当前未选行或是单选行, 函数返回false表示当前非批量处理模式，不予处理。

@param batchOpMode 定制批量操作行为, 比如是否需要按Ctrl激活批量模式, 未按Ctrl时如何处理未选行或单选行。

- batchOpMode未指定或为0时, 使用上面所述的默认批量操作方式.
- 如果值为1: 总是批量操作, 无须按Ctrl键, 无论选择了0行或1行, 都使用当前的过滤条件.
- 如果值为2: 按住Ctrl键时与默认行为相同; 没按Ctrl时, 若选了0行则报错, 若选了1行, 则按批量操作对这1行操作, 过滤条件形式是是`{cond:"id=100"}`

简单来说, 默认模式对单个记录不处理, 返回false留给调用者处理; 模式2是对单个记录也按批量处理; 模式1是无须按Ctrl键就批量处理.

## 示例1: 无须对话框填写额外信息的批量操作

工件列表页(pageSn)中，点"打印条码"按钮, 打印选中的1行或多行的标签, 如果未选则报错. 如果按住Ctrl点击, 则按表格过滤条件批量打印所有行的标签.

显然, 这是一个batchOpMode=2的操作模式, 调用后端`Sn.print`接口, 对一行或多行数据统一处理，在列表页pageSn.js中为操作按钮指定操作:

	// function initPageSn
	var btn1 = {text: "打印条码", iconCls:'icon-ok', handler: function () {
		WUI.batchOp("Sn", "printSn", jtbl, {
			acName: "打印", 
			batchOpMode: 2
		});
	}};

	jtbl.datagrid({
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", btn1),
	});

后端应实现接口`printSn(cond)`, 实现示例:

	function api_printSn() {
		// 通过query接口查询操作对象内容. 
		$param = array_merge($_GET, ["res"=>"code", "fmt"=>"array" ]);
		$arr = callSvcInt("Sn.query", $param);
		addLog($rv);
		foreach ($arr as $one) {
			// 处理每个对象
		}
		// 应返回操作数量
		return count($arr);
	}

@param opt.queryParam

(v6) 基于查询条件的批量处理，即指定opt.queryParam，这时jtbl参数传null，与表格操作无关，只根据指定条件查询数量和批量操作。
注意jtbl和opt.queryParam必须指定其一。参见下面示例4。

## 示例2：打开对话框，批量设置一些信息

在列表页上添加操作按钮，pageXXX.js:

	// 点按钮打开批量上传对话框
	var btn1 = {text: "批量设置", iconCls:'icon-add', handler: function () {
		WUI.showDlg("#dlgUpload", {modal:false, jtbl: jtbl}); // 注意：为对话框传入特别参数jtbl即列表的jQuery对象，在batchOp函数中要使用它。
	}};
	jtbl.datagrid({
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", btn1),
	});

对批量设置页面上调用接口，dlgUpload.js:

	var jtbl;
	jdlg.on("validate", onValidate)
		on("beforeshow", onBeforeShow);

	function onBeforeShow(ev, formMode, opt) {
		jtbl = opt.jtbl; // 记录传入的参数
	}
	function onValidate(ev, mode, oriData, newData) 
	{
		WUI.batchOp("Item", "batchSetItemPrice", jtbl, {
			batchOpMode: 1,  // 无须按Ctrl键, 一律当成批量操作
			data: WUI.getFormData(jfrm),
			onBatchDone: function () {
				WUI.closeDlg(jdlg);
			}
		});
	}

注意：对主表字段的设置都可在通用的详情对话框上解决（若要批量设置子表，也可通过在set/setIf接口里处理虚拟字段解决）。一般无须编写批量设置操作。

## 示例3：打开对话框，先上传文件再批量操作

在安装任务列表页上，点"批量上传"按钮, 打开上传文件对话框(dlgUpload), 选择上传并点击"确定"按钮后, 先上传文件, 再将返回的附件编号批量更新到行记录上.

先选择操作模式batchOpMode=1, 点确定按钮时总是批量处理.

与示例2不同，上传文件是个异步操作，可为参数data传入一个返回Deferred对象（简称dfd）的函数(onGetData)用于生成POST参数，
以支持异步上传文件操作，在dfd.resolve(data)之后才会执行真正的批量操作.

pageTask.js:

	// 点按钮打开批量上传对话框
	var btn2 = {text: "批量上传附件", iconCls:'icon-add', handler: function () {
		WUI.showDlg("#dlgUpload", {modal:false, jtbl: jtbl}); // 注意：为对话框传入特别参数jtbl即列表的jQuery对象，在batchOp函数中要使用它。
	}};

dlgUpload.js:

	var jtbl;
	jdlg.on("validate", onValidate)
		on("beforeshow", onBeforeShow);

	function onBeforeShow(ev, formMode, opt) {
		jtbl = opt.jtbl; // 记录传入的参数
	}
	function onValidate(ev, mode, oriData, newData) 
	{
		WUI.batchOp("Task", "Task.setIf", jtbl, {
			batchOpMode: 1,  // 无须按Ctrl键, 一律当成批量操作
			data: onGetData,
			onBatchDone: function () {
				WUI.closeDlg(jdlg);
			}
		});
	}

	// 一定batchCnt>0. 若batchCnt=0即没有操作数据时, 会报错结束, 不会回调该函数.
	function onGetData(batchCnt)
	{
		var dfd = $.Deferred();
		app_alert("批量上传附件到" + batchCnt + "行记录?", "q", function () {
			var dfd1 = triggerAsync(jdlg.find(".wui-upload"), "submit"); // 异步上传文件，返回Deferred对象
			dfd1.then(function () {
				var data = WUI.getFormData(jfrm);
				if ($.isEmptyObject(data)) {
					app_alert("没有需要更新的内容。");
					return false;
				}
				dfd.resolve(data);
			});
		});
		return dfd.promise();
	}

@see triggerAsync 异步事件调用

上面函数中处理异步调用链，不易理解，可以简单理解为：

	if (confirm("确认操作?") == no)
		return;
	jupload.submit();
	return getFormData(jfrm);

## 示例4: 基于查询条件的批量操作

示例：在工单列表页，批量为工单中的所有工件打印跟踪码。

工单为Ordr对象，工件为Sn对象。注意：此时是操作Sn对象，而非当前Ordr对象，所以不传jtbl，而是直接传入查询条件.

	WUI.batchOp("Sn", "printSn", null, {
		acName: "打印", 
		queryParam: {cond: "orderId=80"},
		data: {tplId: 10}
	});

后端批量打印接口设计为：

	printSn(cond, tplId) -> cnt

上例中，查询操作数量时将调用接口`callSvr("Sn.query", {cond: "orderId=80", res: "count(*) cnt"})`，
在批量操作时调用接口`callSvr("printSn", {cond: "orderId=80"}, $.noop, {tplId: 10})`。
*/
self.batchOp = batchOp;
function batchOp(obj, ac, jtbl, opt)
{
	if (obj == null)
		return false;
	opt = $.extend({
		batchOpMode: 0,
		acName: "操作"
	}, opt);

	var acName = opt.acName;
	var queryParams = opt.queryParam;
	if (queryParams) {
		queryCnt();
		return;
	}

	if (jtbl == null) {
		console.warn("batchOp: require jtbl or opt.queryParam")
		return false;
	}

	var selArr =  jtbl.datagrid("getChecked");
	var batchOpMode = opt.batchOpMode;
	if (!batchOpMode && ! (m_batchMode || selArr.length > 1)) {
		return false;
	}
	if (batchOpMode === 2 && !m_batchMode && selArr.length == 0) {
		self.app_alert("请先选择一行。", "w");
		return false;
	}

	var doBatchOnSel = selArr.length > 1 && (selArr[0].id != null || opt.offline);
	// batchOpMode=2时，未按Ctrl时选中一行也按批量操作
	if (!doBatchOnSel && batchOpMode === 2 && !m_batchMode && selArr.length == 1 && selArr[0].id != null)
		doBatchOnSel = true;

	// offline时批量删除单独处理
	if (opt.offline) {
		if (acName == "删除") {
			var totalCnt = jtbl.datagrid("getRows").length;
			if (doBatchOnSel && selArr.length < totalCnt) {
				$.each(selArr, function (i, row) {
					var idx = jtbl.datagrid("getRowIndex", row);
					jtbl.datagrid("deleteRow", idx)
				});
			}
			else {
				jtbl.datagrid("loadData", []);
			}
		}
		return;
	}

	// 多选，cond为`id IN (...)`
	if (doBatchOnSel) {
		if (selArr.length == 1) {
			queryParams = {cond: "id=" + selArr[0].id};
		}
		else {
			var idList = $.map(selArr, function (e) { return e.id}).join(',');
			queryParams = {cond: "id IN (" + idList + ")"};
		}
		confirmBatch(selArr.length);
	}
	else {
		queryParams = getDgFilter(jtbl);
		if (!queryParams.cond)
			queryParams.cond = "t0.id>0"; // 避免后台因无条件而报错
		queryCnt();
	}
	return;

	function queryCnt() {
		var param = $.extend({}, queryParams, {res: "count(*) cnt"});
		self.callSvr(obj + ".query", param, function (data1) {
			confirmBatch(data1.d[0][0]);
		});
	}
	
	function confirmBatch(batchCnt) {
		console.log(ac + ": " + JSON.stringify(queryParams));
		if (batchCnt == 0) {
			app_alert("没有记录需要操作。");
			return;
		}
		var data = opt.data;
		if (!$.isFunction(data)) {
			if (batchCnt > 1)
				acName = "批量" + acName;
			app_confirm(acName + batchCnt + "条记录？", function (b) {
				if (!b)
					return;
				doBatch(data);
			});
		}
		else {
			var dataFn = data;
			data = dataFn(batchCnt);
			if (data == false)
				return;
			$.when(data).then(doBatch);
		}
	}

	function doBatch(data) {
		self.callSvr(ac, queryParams, function (cnt) {
			opt.onBatchDone && opt.onBatchDone();
			if (jtbl) {
				if (doBatchOnSel && selArr.length == 1) {
					reloadRow(jtbl, selArr[0]);
				}
				else {
					reload(jtbl);
				}
			}
			app_alert(acName + cnt + "条记录");
		}, data);
	}
}

function isFixedField(value) {
	if (value == null)
		return false;
	if (typeof(value) != "string")
		return true;
	return !/^([!<>=~]|IN|NOT IN)/i.test(value);
}

// 修改和返回fixedFields，如果fixedFields为空，可能返回null
function getFixedFields(jpage, fixedFields)
{
	if (! (jpage && jpage.size() > 0))
		return fixedFields;

	var filter = getPageFilter(jpage);
	if (filter && filter.cond) {
		handleCond(filter.cond);
	}
	return fixedFields;

	function handleCond(cond) {
		if (!cond)
			return;
		if ($.isArray(cond)) {
			$.each(cond, function (i, e) {
				handleCond(e);
			});
		}
		else if ($.isPlainObject(cond)) {
			$.each(cond, function (k, v) {
				if (isFixedField(v)) {
					if (fixedFields == null)
						fixedFields = {};
					fixedFields[k] = v;
				}
			});
		}
	}
}

/*
如果objParam中指定了值，则字段只读，并且在forAdd模式下填充值。
如果objParam中未指定值，则不限制该字段，可自由设置或修改。
*/
function setFixedFields(jfrm, beforeShowOpt) {
	var objParam = beforeShowOpt.objParam;
	var fixedFields = beforeShowOpt.fixedFields;
	if (jfrm[0].cleanFn) {
		$.each(jfrm[0].cleanFn, function (i, fn) {
			fn();
		});
		jfrm[0].cleanFn = null;
	}
	var cleanFn = [];
	var forFind = beforeShowOpt.mode == FormMode.forFind;
	self.formItems(jfrm, function (ji, name, it) {
		// 兼容旧的fixedFields设置方法. TODO: 未来将移除
		var fixedVal = (ji.hasClass("wui-fixedField") && objParam && objParam[name] != null)? objParam[name]: null;
		var isOld = false;
		if (fixedVal != null) {
			isOld = true;
		}
		else {
			fixedVal = (fixedFields && fixedFields[name] != null)? fixedFields[name]: null;
		}
		if (fixedVal != null) {
			var oldVal = it.getReadonly();
			it.setReadonly(true);
			if (forFind) { // 查询模式时不用向后端提交fixedFields字段的值，它们会由列表页自动处理。
				var oldVal2 = it.getDisabled();
				it.setDisabled(true);
			}
			if (isOld) {
				it.setValue(fixedVal);
			}
			// 下次进来时恢复状态
			cleanFn.push(function () {
				it.setReadonly(oldVal);
				if (forFind) {
					it.setDisabled(oldVal2);
				}
			});
		}
	});
	if (cleanFn.length > 0)
		jfrm[0].cleanFn = cleanFn;
}

/**
@fn getTopDialog()

取处于最上层的对话框。如果没有，返回jo.size() == 0
*/
self.getTopDialog = getTopDialog;
function getTopDialog()
{
	var val = 0;
	var jo = $();
	$(".window:visible").each(function (i, e) {
		var z = parseInt(this.style.zIndex);
		if (z > val) {
			val = z;
			jo = $(this).find(".wui-dialog");
		}
	});
	return jo;
}

/**
@fn unloadPage(pageName?)

@param pageName 如未指定，表示当前页。

删除一个页面。一般用于开发过程，在修改外部逻辑页后，调用该函数删除页面。此后载入页面，可以看到更新的内容。

注意：对于内部逻辑页无意义。
*/
self.unloadPage = unloadPage;
function unloadPage(pageName)
{
	if (pageName == null) {
		pageName = self.getActivePage().attr("wui-pageName");
		if (pageName == null)
			return;
		self.tabClose();
	}
	// 不要删除内部页面
	var jo = $("."+pageName);
	if (jo.attr("wui-pageFile") == null)
		return;
	jo.remove();
	$("style[wui-origin=" + pageName + "]").remove();
}

/**
@fn reloadPage()

重新加载当前页面。一般用于开发过程，在修改外部逻辑页后，调用该函数可刷新页面。
*/
self.reloadPage = reloadPage;
function reloadPage()
{
	var showPageArgs = self.getActivePage().data("showPageArgs_");
	self.unloadPage();
	self.showPage.apply(this, showPageArgs);
}

/**
@fn unloadDialog(jdlg?)
@alias reloadDialog

删除指定对话框jdlg，如果不指定jdlg，则删除当前激活的对话框。一般用于开发过程，在修改外部对话框后，调用该函数清除以便此后再载入页面，可以看到更新的内容。

	WUI.reloadDialog(jdlg);
	WUI.reloadDialog();
	WUI.reloadDialog(true); // 重置所有外部加载的对话框(v5.1)

注意：

- 对于内部对话框调用本函数无意义。直接关闭对话框即可。
- 由于不知道打开对话框的参数，reloadDialog无法重新打开对话框，因而它的行为与unloadDialog一样。
*/
self.unloadDialog = unloadDialog;
self.reloadDialog = unloadDialog;
function unloadDialog(jdlg)
{
	if (jdlg == null) {
		jdlg = getTopDialog();
	}
	else if (jdlg === true) {
		jdlg = $(".wui-dialog[wui-pageFile]");
	}
	else if (jdlg.hasClass("wui-dialog")) {
	}
	else {
		console.error("WUI.unloadDialog: bad dialog spec", jdlg);
	}

	jdlg.each(function () {
		var jdlg = $(this);  // 故意覆盖原jdlg, 分别处理
		if (jdlg.size() == 0)
			return;
		if (jdlg.is(":visible")) {
			try { closeDlg(jdlg); } catch (ex) { console.log(ex); }
		}

		// 是内部对话框，不做删除处理
		if (jdlg.attr("wui-pageFile") == null)
			return;
		var dlgId = jdlg.attr("id");
		try { jdlg.dialog("destroy"); } catch (ex) { console.log(ex); }
		jdlg.remove();
		$("style[wui-origin=" + dlgId + "]").remove();
	});
}

/**
@fn canDo(topic, cmd=null, defaultVal=null, permSet2=null)

权限检查回调，支持以下场景：

1. 页面上的操作（按钮）

	canDo(页面标题, 按钮标题);// 返回false则不显示该按钮

2. 对话框上的操作

	canDo(对话框标题, "对话框"); // 返回false表示对话框只读
	canDo(对话框标题, 按钮标题); // 返回false则不显示该按钮

特别地：如果对话框或页面上有wui-readonly类，则额外优先用permSet2来检查：

	canDo(对话框, 按钮标题, null, {只读:true}); // 返回false则不显示该按钮

topic可理解为数据对象（页面、对话框对应的数据模型），cmd可理解为操作（增加、修改、删除、只读等，常常是工具栏按钮）。
通过permSet2参数可指定额外权限。

判断逻辑示例：canDo("工艺", "修改")

	如果指定有"工艺.修改"，则返回true，或指定有"工艺.不可修改"，则返回false；否则
	如果指定有"修改"，则返回true，或指定有"不可修改", 则返回 false; 否则
	如果指定有"工艺.只读" 或 "只读"，则返回false; 否则
	如果指定有"工艺"，则返回true，或指定有"不可工艺", 则返回 false; 否则返回默认值。

判断逻辑示例：canDo("工艺", null)

	如果指定有"工艺"，则返回true，或指定有"不可工艺", 则返回 false; 否则默认值

判断逻辑示例：canDo(null, "修改")

	如果指定有"修改"，则返回true，或指定有"不可修改", 则返回 false; 否则
	如果指定有"只读"，则返回false; 否则返回默认值。

默认值逻辑：

	如果指定了默认值defaultVal，则返回defaultVal，否则
	如果指定有"不可*"，则默认值为false，否则返回 true
	(注意：如果未指定"*"或"不可*"，最终是允许)

特别地，对于菜单显示来说，顶级菜单的默认值指定是false，所以如果未指定"*"或"不可*"则最终不显示；
而子菜单的默认值则是父菜单是否允许，不指定则默认与父菜单相同。

建议明确指定默认值，采用以下两种风格之一：

风格一：默认允许，再逐一排除

	* 不可删除 不可导出 不可修改

风格二：默认限制，再逐一允许

	不可* 工单管理

要限制菜单项的话，先指定"不可*"，再加允许的菜单项，这样如果页面中链接其它页面或对话框，则默认是无权限的。
否则链接对象默认是可编辑的，存在漏洞。

TODO:通过设置 WUI.options.canDo(topic, cmd) 可扩展定制权限。

默认情况下，所有菜单不显示，其它操作均允许。
如果指定了"*"权限，则显示所有菜单。
如果指定了"不可XX"权限，则topic或cmd匹配XX则不允许。

@key wui-perm

- topic: 通过菜单、页面、对话框、按钮的wui-perm属性指定（按钮参考dg_toolbar函数），如果未指定，则取其text.
- cmd: 对话框，新增，修改，删除，导出，自定义的按钮

示例：假设有菜单结构如下（不包含最高管理员专有的“系统设置”）

	主数据管理
		企业
		用户

	运营管理
		活动
		公告
		积分商城

只显示“公告”菜单项：

	公告

只显示“运营管理”菜单组：

	运营管理

显示除了“运营管理”外的所有内容：

	* 不可运营管理

其中`*`表示显示所有菜单项。
显示所有内容（与管理员权限相同），但只能查看不可操作

	* 只读

“只读”权限排除了“新增”、“修改”等操作。
特别地，“只读”权限也不允许“导出”操作（虽然导出是读操作，但一般要求较高权限），假如要允许导出公告，可以设置：

	* 只读 公告.导出

显示“运营管理”，在列表页中不显示“删除”、“导出”按钮：

	运营管理 不可删除 不可导出

显示“运营管理”，在列表页中，不显示“删除”、“导出”按钮，但“公告”中显示“删除”按钮：

	运营管理 不可删除 不可导出 公告.删除

或等价于：

	运营管理 不可导出 活动.不可删除 积分商城.不可删除

显示“运营管理”和“主数据管理”菜单组，但“主数据管理”下面内容均是只读的：

	运营管理 主数据管理 企业.只读 用户.只读

## 关于页面与对话框

假如在“活动”页面中链接了“用户”对话框（或“活动”页面上某操作按钮会打开“用户”页面），即使该角色只有“活动”权限而没有“用户”的权限，也能正常打开用户对话框或页面并修改用户。
这是一个潜在安全漏洞，在配置权限时应特别注意。

这样设计是因为用户权限主要是针对菜单项的，而且可以只指定到父级菜单（表示下面子菜单均可显示）；这样就导致对未指定的权限，也无法判断是否可用（因为可能是菜单子项），目前处理为默认可用（可通过权限`不可*`来指定默认不可用）。

以指定运营管理下所有功能为例，解决办法：

- 简单的处理方式是对于所有链接的内容，分别加入黑名单，如特别指定“不可用户”（或指定“用户.只读”），这时链接的对话框或页面将以只读模式打开（对话框不可设置，页面无操作按钮）。最终权限指定为`运营管理 不可用户`

- 还有一种拒绝优先+精确指定的处理方式，即先指定`不可*`，然后再精确指定该角色可用的所有权限（通常是列举所有子菜单项供打勾选择）。最终权限指定为`不可* 活动 公告 积分商城`。这时应注意：
如果菜单项、页面、对话框的权限名不相同的，则可能出现菜单项能显示，而页面和对话框显示为只读。这种情况应确保菜单、页面、对话框的权限名（标题名或设置菜单的wui-perm属性）应一致。
例如菜单项叫“活动管理”而对话框和页面名为“活动”，则可将菜单的wui-perm属性设置为“活动”。
还有种比较常见的情况是页面和对话框为多个对象共用的（如客户和供应商共用一个页面和对话框），也是确保菜单名、页面名、对话框一致，在处理时往往是以showPage将菜单名传到页面，从页面打开对话框时则以页面标题指定对话框标题。

 */
self.canDo = canDo;
function canDo(topic, cmd, defaultVal, permSet2)
{
//	console.log('canDo: ', topic, cmd);
	if (!g_data.permSet) // 现在不可能为空了，管理员的permSet是 {"*": true}
		return true;

	if (defaultVal == null)
		defaultVal = (checkPerm('*') !== false);
	if (cmd == null) {
		if (topic) {
			var rv = checkPerm(topic);
			if (rv !== undefined)
				return rv;
		}
		return defaultVal;
	}

	if (topic) {
		var rv = checkPerm(topic + "." + cmd);
		if (rv !== undefined)
			return rv;
	}

	rv = checkPerm(cmd);
	if (rv !== undefined)
		return rv;

	// 对“只读”特殊处理
	if (topic)
		rv = checkPerm(topic + ".只读");
	if (rv === undefined)
		rv = checkPerm("只读");
	if (rv && (cmd == "新增" || cmd == "修改" || cmd == "删除" || cmd == "导入" || cmd == "对话框")) {
		return false;
	}

	if (topic) {
		rv = checkPerm(topic);
		if (rv !== undefined)
			return rv;
	}
	
	return defaultVal;

	// 返回true, false, undefined三种
	function checkPerm(perm) {
		if (permSet2) {
			var rv = permSet2[perm];
			if (rv !== undefined)
				return rv;
		}
		return g_data.permSet[perm];
	}
}

// ---- object CRUD {{{
var BTN_TEXT = ["添加", "保存", "保存", "查找", "删除"];
// e.g. var text = BTN_TEXT[mode];

function getFindData(jfrm, doGetAll)
{
	var kvList = {};
	var kvList2 = {};
	self.formItems(jfrm, function (ji, name, it) {
		if ((!doGetAll && it.getDisabled()) || ji.hasClass("notForFind"))
			return;
		var v = it.getValue();
		if (v == null || v === "")
			return;
		if (ji.attr("wui-find-hint")) {
			name += "/" + ji.attr("wui-find-hint");
		}
		if (ji.hasClass("wui-notCond"))
			kvList2[name] = v;
		else
			kvList[name] = v;
	})
	var param = self.getQueryParam(kvList);
	if (kvList2) 
		$.extend(param, kvList2);
	return param;
}

/*
加载jdlg(当它的size为0时)，注意加载成功后会添加到jdlg对象中。
返回true表示将动态加载对话框，调用者应立即返回，后续逻辑在onLoad回调中操作。

	if (loadDialog(jdlg, onLoad))
		return;

	function onLoad() {
		showDlg(jdlg...);
	}

opt: {meta, metaParent}
*/
function loadDialog(jdlg, onLoad, opt)
{
	// 判断dialog未被移除
	if (jdlg.size() > 0 && jdlg[0].parentElement != null && jdlg[0].parentElement.parentElement != null)
		return;
	opt = opt || {};
	// showDlg支持jdlg为新创建的jquery对象，这时selector为空
	if (!jdlg.selector) {
		jdlg.addClass('wui-dialog');
		var jcontainer = $("#my-pages");
		jdlg.appendTo(jcontainer);
		loadDialogTpl1();
		return true;
	}
	var jo = $(jdlg.selector);
	if (jo.size() > 0) {
		fixJdlg(jo);
		return;
	}

	function fixJdlg(jo)
	{
		jdlg.splice(0, jdlg.size(), jo[0]);
	}

	var dlgId = jdlg.selector.substr(1);
	// 支持dialog复用，dlgId格式为"{模板id}_inst_{后缀名}"。如 dlgUDT_inst_A 与 dlgUDT_inst_B 共用dlgUDT对话框模板。
	var arr = dlgId.split("_inst_");
	var tplName = arr[0];
	var sel = "#tpl_" + tplName;
	var html = $(sel).html();
	if (html) {
		loadDialogTpl(html, dlgId, pageFile);
		return true;
	}

	var pageFile = getModulePath(tplName + ".html");
	$.ajax(pageFile).then(function (html) {
		loadDialogTpl(html, dlgId, pageFile);
	})
	.fail(function () {
		//self.leaveWaiting();
	});

	function loadDialogTpl(html, dlgId, pageFile)
	{
		var jcontainer = $("#my-pages");
		// 注意：如果html片段中有script, 在append时会同步获取和执行(jquery功能)
		var jo = $(html).filter("div,form");
		if (jo.size() > 1 || jo.size() == 0) {
			console.log("!!! Warning: bad format for dialog '" + dlgId + "'. Element count = " + jo.size());
			jo = jo.filter(":first");
		}

		fixJdlg(jo);
		// 限制css只能在当前页使用
		jdlg.find("style").each(function () {
			$(this).html( self.ctx.fixPageCss($(this).html(), jdlg.selector) );
		});
		// bugfix: 加载页面页背景图可能反复被加载
		jdlg.find("style").attr("wui-origin", dlgId).appendTo(document.head);
		jdlg.attr("id", dlgId).appendTo(jcontainer);
		jdlg.attr("wui-pageFile", pageFile);
		jdlg.addClass('wui-dialog');

		var dep = self.evalAttr(jdlg, "wui-deferred");
		if (dep) {
			self.assert(dep.then, "*** wui-deferred attribute DOES NOT return a deferred object");
			dep.then(loadDialogTpl1);
			return;
		}
		loadDialogTpl1();
	}

	function loadDialogTpl1()
	{
		var obj = opt.obj || jdlg.attr("my-obj");
		var meta = opt.meta || (obj && self.UDF.onGetMeta(obj));
		// 支持由meta动态生成输入字段
		if (meta) {
			var jp = jdlg.find(opt.metaParent || "table:first");
			// 通过wui-meta-parent类控制只加1次meta
			if (jp.size() > 0 && !jp.hasClass("wui-meta-parent")) {
				self.UDF.addFieldByMeta(jdlg, jp, meta);
				jp.addClass("wui-meta-parent");
			}
		}

		enhanceDialog(jdlg);
		$.parser.parse(jdlg); // easyui enhancement
		jdlg.find(">table:first, form>table:first").has(":input").addClass("wui-form-table");
		self.enhanceWithin(jdlg);

		var val = jdlg.attr("wui-script");
		if (val != null) {
			var path = getModulePath(val);
			var dfd = mCommon.loadScript(path, onLoad);
			dfd.fail(function () {
				self.app_alert("加载失败: " + val);
			});
		}
		else {
			// bugfix: 第1次点击对象链接时(showObjDlg动态加载对话框), 如果出错(如id不存在), 系统报错但遮罩层未清, 导致无法继续操作.
			// 原因是, 在ajax回调中再调用*同步*ajax操作且失败(这时$.active=2), 在dataFilter中会$.active减1, 然后强制用app_abort退出, 导致$.active清0, 从而在leaveWaiting时无法hideLoading
			// 解决方案: 在ajax回调处理中, 为防止后面调用同步ajax出错, 使用setTimeout让第一个调用先结束.
			setTimeout(onLoad);
		}
	}
	return true;
}

/**
@fn doFind(jo, jtbl?, doAppendFilter?=false)

根据对话框中jo部分内容查询，结果显示到表格(jtbl)中。
jo一般为对话框内的form或td，也可以为dialog自身。
查询时，取jo内部带name属性的字段作为查询条件。如果有多个字段，则生成AND条件。

如果查询条件为空，则不做查询；但如果指定jtbl的话，则强制查询。

jtbl未指定时，自动取对话框关联的表格；如果未关联，则不做查询。
doAppendFilter=true时，表示追加过滤条件。

@see .wui-notCond 指定独立查询条件
 */
self.doFind = doFind;
function doFind(jo, jtbl, doAppendFilter)
{
	var force = (jtbl!=null);
	if (!jtbl) {
		var jdlg = jo.closest(".wui-dialog");
		if (jdlg.size() > 0)
			jtbl = jdlg.jdata().jtbl;
	}
	if (!jtbl || jtbl.size() == 0) {
		console.warn("doFind: no table");
		return;
	}

	var param = getFindData(jo, true);
	if (!force && $.isEmptyObject(param)) {
		console.warn("doFind: no param");
		return;
	}

	// 归并table上的cond条件. dgOpt.url是makeUrl生成的，保存了原始的params
	// 避免url和queryParams中同名cond条件被覆盖，因而用AND合并。
	// 注意：这些逻辑在dgLoader中处理。
	reload(jtbl, undefined, param, doAppendFilter); // 将设置dgOpt.queryParams
}

/**
@fn showObjDlg(jdlg, mode, opt?={jtbl, id, obj})

@param jdlg 可以是jquery对象，也可以是selector字符串或DOM对象，比如 "#dlgOrder". 注意：当对话框保存为单独模块时，jdlg=$("#dlgOrder") 一开始会为空数组，这时也可以调用该函数，且调用后jdlg会被修改为实际加载的对话框对象。

@param opt.id String. 对话框set模式(mode=FormMode.forSet)时必设，set/del如缺省则从关联的opt.jtbl中取, add/find时不需要
@param opt.jtbl Datagrid. 指定对话框关联的列表(datagrid)，用于从列表中取值，或最终自动刷新列表。 -- 如果dlg对应多个tbl, 必须每次打开都设置
@param opt.obj String. (v5.1) 对象对话框的对象名，如果未指定，则从my-obj属性获取。通过该参数可动态指定对象名。
@param opt.offline Boolean. (v5.1) 不与后台交互。
@param opt.readonly String. (v5.5) 指定对话框只读。即设置wui-readonly类。

showObjDlg底层通过showDlg实现，(v5.5)showObjDlg的opt会合并到showDlg的opt参数中，同时showDlg的opt.objParam将保留showObjDlg的原始opt。在每次打开对话框时，可以从beforeshow回调事件参数中以opt.objParam方式取出.
以下代码帮助你理解这几个参数的关系：

	function showObjDlg(jdlg, mode, opt)
	{
		opt = $.extend({}, jdlg.objParam, opt);
		var showDlgOpt = $.extend({}, opt, {
			...
			objParam: opt
		});
		showDlg(jdlg, showDlgOpt);
	}
	jdlg.on("beforeshow", function (ev, formMode, opt) {
		// opt即是上述showDlgOpt
		// opt.objParam为showObjDlg的原始opt，或由jdlg.objParam传入
	});

@param opt.title String. (v5.1) 指定对话框标题。
@param opt.data Object. (v5.5) 为对话框指定初始数据，对话框中name属性匹配的控件会在beforeshow事件后且show事件前自动被赋值。
param opt.onOk Function(retData) (v6) 与showDlg的onOk参数一致。在提交数据后回调，参数为后端返回数据，比如add接口返回新对象的id。

注意：如果是forSet模式的对话框，即更新数据时，只有与原始数据不同的字段才会提交后端。

其它参数可参考showDlg函数的opt参数。

@key objParam 对象对话框的初始参数。

(v5.1)
此外，通过设置jdlg.objParam，具有和设置opt参数一样的功能，常在initPageXXX中使用，因为在page中不直接调用showObjDlg，无法直接传参数opt.
示例：

	var jdlg = $("#dlgSupplier");
	jdlg.objParam = {type: "C", obj: "Customer"};
	showObjDlg(jdlg, FormMode.forSet, {id:101});
	// 等价于 showObjDlg(jdlg, FormMode.forSet, {id:101, obj: "Customer", type: "C"});

在dialog的事件beforeshow(ev, formMode, opt)中，可以通过opt.objParam取出showObjDlg传入的所有参数opt。
(v5.3) 可在对象对话框的初始化函数中使用 initDlgXXX(opt)，注意：非对象对话框初始化函数的opt参数与此不同。

@param opt.onCrud Function(). (v5.1) 对话框操作完成时回调。
一般用于点击表格上的增删改查工具按钮完成操作时插入逻辑。
在回调函数中this对象就是objParam，可通过this.mode获取操作类型。示例：

	jdlg1.objParam = {
		offline: true,
		onCrud: function () {
			if (this.mode == FormMode.forDel) {
				// after delete row
			}

			// ... 重新计算金额
			var rows = jtbl.datagrid("getData").rows, amount = 0;
			$.each(rows, function(e) {
				amount += e.price * e.qty;
			})
			frm.amount.value = amount.toFixed(2);
			// ... 刷新关联的表格行
			// opt.objParam.reloadRow();
		}
	};
	jtbl.datagrid({
		toolbar: WUI.dg_toolbar(jtbl, jdlg1), // 添加增删改查工具按钮，点击则调用showObjDlg，这时objParam生效。
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg1),
		...
	});

在dialog逻辑中使用objParam:

	function initDlgXXX() {
		// ...
		jdlg.on("beforeshow", onBeforeShow);
		
		function onBeforeShow(ev, formMode, opt) {
			var objParam = opt.objParam; // {id, mode, jtbl?, offline?...}
		}
	}

@param opt.reloadRow() 可用于刷新本对话框关联的表格行数据

事件参考：
@see showDlg
*/
self.showObjDlg = showObjDlg;
function showObjDlg(jdlg, mode, opt)
{
	if (jdlg.constructor != jQuery)
		jdlg = $(jdlg);
	if (loadDialog(jdlg, onLoad, opt))
		return;
	function onLoad() {
		jdlg.trigger('create');
		showObjDlg(jdlg, mode, opt);
	}

	opt = $.extend({mode: mode}, jdlg.objParam, opt);
	jdlg.data("objParam", jdlg.objParam);
	callInitfn(jdlg, [opt]);
	if (opt.jtbl) {
		jdlg.jdata().jtbl = opt.jtbl;
	}
	var id = opt.id;

// 一些参数保存在jdlg.jdata(), 
// mode: 上次的mode
// 以下参数试图分别从jdlg.jdata()和jtbl.jdata()上取. 当一个dlg对应多个tbl时，应存储在jtbl上。
// init_data: 用于add时初始化的数据 
// url_param: 除id外，用于拼url的参数
	var obj = opt.obj || jdlg.attr("my-obj");
	mCommon.assert(obj);
	var jd = jdlg.jdata();
	var jd2 = jd.jtbl && jd.jtbl.jdata();

	// get id
	var rowData;
	if (id == null) {
		if (mode == FormMode.forSet || mode == FormMode.forDel) // get dialog data from jtbl row, 必须关联jtbl
		{
			mCommon.assert(jd.jtbl);

			// 批量删除
			if (mode == FormMode.forDel) {
				var rv = batchOp(obj, obj+".delIf", jd.jtbl, {
					acName: "删除",
					onBatchDone: onCrud,
					offline: opt.offline
				});
				if (rv !== false)
					return;
			}

			rowData = getRow(jd.jtbl);
			if (rowData == null)
				return;
			id = rowData.id;
		}
	}

	var url;
	if (mode == FormMode.forAdd) {
		if (! opt.offline)
			url = self.makeUrl([obj, "add"], jd.url_param);
//		if (jd.jtbl) 
//			jd.jtbl.datagrid("clearSelections");
	}
	else if (mode == FormMode.forSet) {
		if (! opt.offline)
			url = self.makeUrl([obj, "set"], {id: id});
	}
	else if (mode == FormMode.forDel) {
		if (opt.offline) {
			if (jd.jtbl) {
				var rowIndex = jd.jtbl.datagrid("getRowIndex", rowData);
				jd.jtbl.datagrid("deleteRow", rowIndex);
				onCrud();
			}
			return;
		}

		self.app_confirm("确定要删除一条记录?", function (b) {
			if (! b)
				return;

			var ac = obj + ".del";
			self.callSvr(ac, {id: id}, function(data) {
				if (jd.jtbl)
					reload(jd.jtbl);
				self.app_show('删除成功!');
				onCrud();
			});
		});
		return;
	}

	// TODO: 直接用jdlg
	var jfrm = jdlg.is("form")? jdlg: jdlg.find("form:first");
	
	// 设置find模式
	var doReset = ! (jd.mode == FormMode.forFind && mode == FormMode.forFind) // 一直是find, 则不清除
	if (mode == FormMode.forFind && jd.mode != FormMode.forFind) {
		self.formItems(jfrm, function (je, name, it) {
			var jshow = it.getShowbox();
			var bak = je.jdata().bak = {
				disabled: it.getDisabled(),
				readonly: it.getReadonly(),
				title: jshow.prop("title"),
				type: null
			}
			if (je.hasClass("notForFind")) {
				it.setDisabled(true);
				jshow.css("backgroundColor", "");
			}
			else if (jshow.is("[type=hidden]")) {
			}
			else {
				jshow.addClass("wui-find-field")
					.prop("title", self.queryHint);
				it.setDisabled(false);
				it.setReadonly(false);
				var type = jshow.attr("type");
				if (type && ["number", "date", "time", "datetime"].indexOf(type) >= 0) {
					bak.type = type;
					jshow.attr("type", "text");
				}
			}
		});
		jfrm.form("disableValidation");
	}
	else if (jd.mode == FormMode.forFind && mode != FormMode.forFind) {
		self.formItems(jfrm, function (je, name, it) {
			var bak = je.jdata().bak;
			if (bak == null)
				return;
			it.setDisabled(bak.disabled);
			it.setReadonly(bak.readonly);
			var jshow = it.getShowbox();
			jshow.removeClass("wui-find-field")
			jshow.prop("title", bak.title);
			if (bak.type) {
				jshow.attr("type", bak.type);
			}
		});
		jfrm.form("enableValidation");
	}

	jd.mode = mode;

	// load data
	var load_data = {};
	if (mode == FormMode.forAdd) {
		// var init_data = jd.init_data || (jd2 && jd2.init_data);
		load_data = $.extend({}, opt.data);
		// 添加时尝试设置父结点
		if (jd.jtbl && isTreegrid(jd.jtbl) && (rowData=getRow(jd.jtbl, true))) {
			// 在展开的结点上点添加，默认添加子结点；否则添加兄弟结点
			if (rowData.state == "open") {
				load_data["fatherId"] = rowData.id;
				//load_data["level"] = rowData.level+1;
			}
			else {
				load_data["fatherId"] = rowData["fatherId"];
				//load_data["level"] = rowData["level"];
			}
		}
	}
	else if (mode == FormMode.forSet) {
		if (rowData) {
			load_data = $.extend({}, rowData);
		}
		else {
			var load_url = self.makeUrl([obj, 'get'], {id: id});
			var data = self.callSvrSync(load_url);
			if (data == null)
				return;
			load_data = data;
		}
		if (opt.data) {
			setTimeout(function () {
				mCommon.setFormData(jdlg, opt.data, {setOnlyDefined: true});
			});
		}
	}
	// objParam.reloadRow()
	opt.reloadRow = function () {
		if (mode == FormMode.forSet && opt.jtbl && rowData)
			self.reloadRow(opt.jtbl, rowData);
	};

	// opt.fixedFields叠加上pageFilter.cond中的有效字段，并复制到opt.data中。
	var jpage = opt.jtbl? opt.jtbl.closest(".wui-page"): null;
	opt.fixedFields = getFixedFields(jpage, opt.fixedFields);
	if (opt.fixedFields && (mode == FormMode.forAdd || mode == FormMode.forFind)) {
		$.extend(load_data, opt.fixedFields);
	}

	var jchkClose = null;

	// open the dialog
	var showDlgOpt = $.extend({}, opt, {
		url: url,
		okLabel: BTN_TEXT[mode],
		validate: mode!=FormMode.forFind,
		modal: false,  // mode == FormMode.forAdd || mode == FormMode.forSet
		reset: doReset,
		data: load_data,
//		onSubmit: onSubmit,
		onOk: onOk,
		objParam: opt,
		onShow: onShow
	});
	showDlg(jdlg, showDlgOpt);

	if (mode == FormMode.forSet)
		jfrm.form("validate");

	function onShow(formMode, data) {
		var jbtns = jdlg.next(".dialog-button");
		jchkClose = jbtns.find(".chkClose");
		if (jchkClose.size() == 0) {
			var jo = $("<label style='float:left'><input type='checkbox' class='chkClose'> 确定后关闭</label>").prependTo(jbtns);
			jchkClose = jo.find(".chkClose");

			if (formMode == FormMode.forAdd) {
				var val = jdlg.data("closeAfterAdd");
				if (val || self.options.closeAfterAdd)
					jchkClose.prop("checked", true);
			}
			else if (formMode == FormMode.forFind) {
				var val = jdlg.data("closeAfterFind");
				if (val || self.options.closeAfterFind)
					jchkClose.prop("checked", true);
			}
			else if (formMode == FormMode.forSet) {
				jchkClose.prop("checked", true);
			}
			jchkClose.click(function () {
				var val = jchkClose.prop("checked");
				if (formMode == FormMode.forAdd) {
					jdlg.data("closeAfterAdd", val);
				}
				else if (formMode == FormMode.forFind) {
					jdlg.data("closeAfterFind", val);
				}
			});
		}
	}

	function onOk (retData) {
		opt.onOk && opt.onOk(retData);
		var jtbl = jd.jtbl;
		mCommon.assert(jchkClose.size() > 0);
		var doClose = jchkClose.prop("checked");
		if (mode==FormMode.forFind) {
			mCommon.assert(jtbl); // 查询结果显示到jtbl中
			//doFind(jfrm, jtbl);
			reload(jtbl, undefined, retData);
			// onCrud();
			if (doClose)
				closeDlg(jdlg);
			return;
		}
		// add/set/link
		// TODO: add option to force reload all (for set/add)
		var dfdSet = null;
		if (jtbl) {
			if (opt.offline) {
				var retData_vf = self.getFormData_vf(jfrm);
				retData = $.extend(retData_vf, retData);
				if (mode == FormMode.forSet && rowData) {
					var idx = jtbl.datagrid("getRowIndex", rowData);
					$.extend(rowData, retData);
					jtbl.datagrid("refreshRow", idx);
				}
				else if (mode == FormMode.forAdd) {
					jtbl.datagrid("appendRow", retData);
				}
			}
			else {
				if (mode == FormMode.forSet && rowData)
					dfdSet = reloadRow(jtbl, rowData);
				else if (mode == FormMode.forAdd) {
					appendRow(jtbl, retData);
				}
				else
					reload(jtbl);
			}
		}
		if (doClose) {
			closeDlg(jdlg);
		}
		else if (mode == FormMode.forAdd) {
			showObjDlg(jdlg, mode); // reset and add another
		}
		else if (mode == FormMode.forSet) {
			if (dfdSet) {
				dfdSet.then(function () {
					showObjDlg(jdlg, mode, opt);
				});
			}
			else {
				setTimeout(function () {
					showObjDlg(jdlg, mode, opt);
				});
			}
		}
		if (!opt.offline)
			self.app_show('操作成功!');
		onCrud();
	}

	function onCrud() {
		if (self.isBusy) {
			$(document).one("idle", onCrud);
			return;
		}
		if (obj && !opt.offline) {
			console.log("refresh: " + obj);
			$(".my-combobox,.wui-combogrid").trigger("markRefresh", obj);
		}
		opt.onCrud && opt.onCrud();
	}
}

/**
@fn dg_toolbar(jtbl, jdlg, button_lists...)

@param jdlg 可以是对话框的jquery对象，或selector如"#dlgOrder".

设置easyui-datagrid上toolbar上的按钮。缺省支持的按钮有r(refresh), f(find), a(add), s(set), d(del), 可通过以下设置方式修改：

	// jtbl.jdata().toolbar 缺省值为 "rfasd"
	jtbl.jdata().toolbar = "rfs"; // 没有a-添加,d-删除.
	// (v5.5) toolbar也可以是数组, 如 ["r", "f", "s", "export"]; 空串或空数组表示没有按钮.

如果要添加自定义按钮，可通过button_lists一一传递.
示例：添加两个自定义按钮查询“今天订单”和“所有未完成订单”。

	function getTodayOrders()
	{
		var queryParams = WUI.getQueryParam({comeTm: new Date().format("D")});
		WUI.reload(jtbl, null, queryParams);
	}
	// 显示待服务/正在服务订单
	function getTodoOrders()
	{
		var queryParams = {cond: "status=" + OrderStatus.Paid + " or status=" + OrderStatus.Started};
		WUI.reload(jtbl, null, queryParams);
	}
	var btn1 = {text: "今天订单", iconCls:'icon-search', handler: getTodayOrders};
	var btn2 = {text: "所有未完成", iconCls:'icon-search', handler: getTodoOrders};

	// 默认显示当天订单
	var queryParams = WUI.getQueryParam({comeTm: new Date().format("D")});

	var dgOpt = {
		url: WUI.makeUrl(["Ordr", "query"]),
		queryParams: queryParams,
		pageList: ...
		pageSize: ...
		// "-" 表示按钮之间加分隔符
		toolbar: WUI.dg_toolbar(jtbl, jdlg, btn1, "-", btn2),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	};
	jtbl.datagrid(dgOpt);

特别地，要添加导出数据到Excel文件的功能按钮，可以增加参数"export"作为按钮定义：
导入可以用"import", 快速查询可以用"qsearch" (这两个以扩展方式在jdcloud-wui-ext.js中定义):

	var dgOpt = {
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "import", "export", "-", btn1, btn2, "qsearch"),
	}

@see toolbar-qsearch 模糊查询

如果想自行定义导出行为参数，可以参考WUI.getExportHandler
@see getExportHandler 导出按钮设置

按钮的权限（即是否显示）取决于wui-perm和text属性。优先使用wui-perm。系统内置的常用的有："新增", "修改", "删除", "导出"
下面例子，把“导入”特别设置为内置的权限“新增”，这样不仅不必在角色管理中设置，且设置了“只读”等权限也可自动隐藏它。

	var btnImport = {text: "导入", "wui-perm": "新增", iconCls:'icon-ok', handler: function () {
		DlgImport.show({obj: "Ordr"}, function () {
			WUI.reload(jtbl);
		});
	}};

支持定义扩展，比如importOrdr:

	// ctx = {jtbl, jp, jdlg} // jp是jpage或jdlg，为上一层容器。jdlg是表格关联的对话框，
	// 注意jdlg在调用时可能尚未初始化，可以访问 jdlg.selector和jdlg.objParam等。
	dg_toolbar.importOrdr = function (ctx) {
		return {text: "导入", "wui-perm": "新增", iconCls:'icon-ok', handler: function () {
			DlgImport.show({obj: "Ordr"}, function () {
				WUI.reload(jtbl);
			});
		}}
	};

这时就可以直接这样来指定导入按钮（便于全局重用）：

	WUI.dg_toolbar(jtbl, jdlg, ..., "importOrdr")

@key event-dg_toolbar(ev, jtbl, jdlg) 定制列表按钮事件

示例：为订单列表增加一个“关联商品”按钮

	$(document).on("dg_toolbar", ".wui-page.pageOrder", pageOrder_onToolbar);
	// 用于二次开发，更成熟的写法像这样
	// $(document).off("dg_toolbar.pageOrder").on("dg_toolbar.pageOrder", ".wui-page.pageOrder", pageOrder_onToolbar);
	function pageOrder_onToolbar(ev, buttons, jtbl, jdlg) {
		// var jpage = $(ev.target);
		// console.log(jpage);
		var btnLinkToItem = {text: "关联商品", iconCls: "icon-redo", handler: function () {
			var row = WUI.getRow(jtbl);
			if (row == null)
				return;
			var pageFilter = { cond: {id: row.itemId} };
			PageUi.show("商品", "关联商品-订单"+row.id, pageFilter);
		}};
		buttons.push(btnLinkToItem);
	}

*/
self.dg_toolbar = dg_toolbar;
function dg_toolbar(jtbl, jdlg)
{
	var toolbar = null;
	if (jtbl == null) {
		toolbar = "";
	}
	else {
		toolbar = jtbl.jdata().toolbar;
		if (toolbar == null)
			toolbar = "rfasd";
		jtbl.jdata().toolbar = ""; // 避免再调用时按钮添加重复
	}
	var btns = [];

	/*
	var org_url, org_param;

	// at this time jtbl object has not created
	setTimeout(function () {
		var jtbl_opt = jtbl.datagrid("options");
		org_url = jtbl_opt.url;
		org_param = jtbl_opt.queryParams || '';
	}, 100);
	*/

	var btnSpecArr = $.isArray(toolbar)? $.extend([], toolbar): toolbar.split("");
	for (var i=2; i<arguments.length; ++i) {
		btnSpecArr.push(arguments[i]);
	}

	// 页面或对话框上的button
	var permSet2 = null;
	if (jtbl) {
		var jp = jtbl.closest(".wui-page");
		if (jp.size() == 0)
			jp = jtbl.closest(".wui-dialog");
		var perm = jp.attr("wui-perm") || jp.attr("title");
		if (!perm && jp.hasClass("wui-dialog")) {
			var tmp = jp.dialog("options");
			if (tmp)
				perm = tmp.title;
		}
		jp.trigger("dg_toolbar", [btnSpecArr, jtbl, jdlg]);
		permSet2 = (jtbl.jdata().readonly || jp.hasClass("wui-readonly"))? {"只读": true}: null;
	}
	var ctx = {jp: jp, jtbl: jtbl, jdlg: jdlg};
	for (var i=0; i<btnSpecArr.length; ++i) {
		var btn = btnSpecArr[i];
		if (! btn)
			continue;
		if (btn !== '-' && typeof(btn) == "string") {
			var btnfn = dg_toolbar[btn];
			mCommon.assert(btnfn, "toolbar button `" + btn + "` does not support");
			btn = btnfn(ctx);
		}
		else if ($.isArray(btn) && typeof(btn[0]) == "string") {
			var btnfn = dg_toolbar[btn[0]];
			mCommon.assert(btnfn, "toolbar button `" + btn[0] + "` does not support");
			btn = btnfn(ctx, btn[1]);
		}
		if (btn.text != "-" && perm && !self.canDo(perm, btn["wui-perm"] || btn.text, null, permSet2)) {
			continue;
		}
		btns.push(btn);
	}

	if (btns.length == 0)
		return null;
	return btns;
}

$.extend(dg_toolbar, {
	r: function (ctx) {
		return {text:'刷新', iconCls:'icon-reload', handler: function() {
			reload(ctx.jtbl, null, m_batchMode?{}:null);
		}} // Ctrl-点击，清空查询条件后查询。
	},
	f: function (ctx) {
		// 支持用户自定义查询。class是扩展属性，参考 EXT_LINK_BUTTON
		return {text:'查询', class: 'splitbutton', iconCls:'icon-search', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forFind, {jtbl: ctx.jtbl});
		}, menu: self.createFindMenu(ctx.jtbl) }
	},
	a: function (ctx) {
		return {text:'新增', iconCls:'icon-add', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forAdd, {jtbl: ctx.jtbl});
		}}
	},
	s: function (ctx) {
		return {text:'修改', iconCls:'icon-edit', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forSet, {jtbl: ctx.jtbl});
		}}
	},
	d: function (ctx) {
		return {text:'删除', iconCls:'icon-remove', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forDel, {jtbl: ctx.jtbl});
		}}
	},
	'export': function (ctx) {
		return {text: '导出', iconCls: 'icon-save', handler: getExportHandler(ctx.jtbl)}
	}
});

/**
@fn dg_dblclick(jtbl, jdlg)

@param jdlg 可以是对话框的jquery对象，或selector如"#dlgOrder".

设置双击datagrid行的回调，功能是打开相应的dialog
*/
self.dg_dblclick = function (jtbl, jdlg)
{
	return function (idx, data) {
//		jtbl.datagrid("selectRow", idx);
		showObjDlg(jdlg, FormMode.forSet, {jtbl: jtbl});
	}
}

//}}}

/**
@key a[href=#page]

页面中的a[href]字段会被框架特殊处理：

	<a href="#pageHome">首页</a>
	<a href="http://baidu.com">百度</a>

- href="#pageXXX"开头的，点击时会调用 WUI.showPage("#pageXXX");
*/
self.m_enhanceFn["a[href]"] = enhanceAnchor;
//self.m_enhanceFn["a[href^='#']"] = enhanceAnchor;
function enhanceAnchor(jo)
{
	if (jo.attr("onclick"))
		return;
	if (jo.attr("target"))
		return;

	var title = jo.text();
//	console.log(title);
	jo.click(function (ev) {
		var href = $(this).attr("href");
		if (href.search(/^#(page\w+)$/) >= 0) {
			var pageName = RegExp.$1;
			WUI.showPage.call(this, pageName);
			return false;
		}
/*
		// href="?fn"，会直接调用函数 fn(); 函数中this对象为当前DOM对象
		else if (href.search(/^\?(\w+)$/) >= 0) {
			var fn = RegExp.$1;
			fn = eval(fn);
			if (fn)
				fn.call(this);
			return false;
		}
*/
		if (href.match(/^https?:\/\//)) {
			WUI.showPage("pageIframe", title, [href]);
			return false;
		}
	});
}

/**
@fn getExportHandler(jtbl, ac?, param?={})

为数据表添加导出Excel菜单，如：

	jtbl.datagrid({
		url: WUI.makeUrl("User.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, {text:'导出', iconCls:'icon-save', handler: WUI.getExportHandler(jtbl) }),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	});

默认是导出数据表中直接来自于服务端的字段，并应用表上的查询条件及排序。
也可以通过设置param参数手工指定，如：

	handler: WUI.getExportHandler(jtbl, "User.query", {res: "id 编号, name 姓名, createTm 注册时间", orderby: "createTm DESC"})

注意：由于分页机制影响，会设置参数{pagesz: -1}以便在一页中返回所有数据，而实际一页能导出的最大数据条数取决于后端设置（默认1000，参考后端文档 AccessControl::$maxPageSz）。

会根据datagrid当前设置，自动为query接口添加res(输出字段), cond(查询条件), fname(导出文件名), orderby(排序条件)参数。

若是已有url，希望从datagrid获取cond, fname等参数，而不要覆盖res参数，可以这样做：

	var url = WUI.makeUrl("PdiRecord.query", ...); // makeUrl生成的url具有params属性，为原始查询参数
	var btnExport = {text:'导出', iconCls:'icon-save', handler: WUI.getExportHandler(jtbl, null, {res: url.params.res || null}) };

@see getQueryParamFromTable 获取datagrid的当前查询参数
*/
self.getExportHandler = getExportHandler;
function getExportHandler(jtbl, ac, param)
{
	param = $.extend({}, {
		fmt: "excel",
		pagesz: -1
	}, param);

	return function () {
		if (ac == null) {
			if (jtbl.size() == 0 || !jtbl.hasClass("datagrid-f"))
				throw "error: bad datagrid: \"" + jtbl.selector + "\"";
			var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
			ac = jtbl[datagrid]("options").url;
			if (ac == null) {
				app_alert("该数据表不支持导出", "w");
				return;
			}
		}
		var p1 = getQueryParamFromTable(jtbl, param);
		var debugShow = false;
		if (m_batchMode) {
			var fmt = prompt("输入导出格式: excel csv txt excelcsv html (以!结尾为调试输出)", p1.fmt);
			if (!fmt)
				return;
			if (fmt.substr(-1) == "!") {
				fmt = fmt.substr(0, fmt.length-1);
				debugShow = true;
			}
			p1.fmt = fmt;
		}

		var url = WUI.makeUrl(ac, p1);
		// !!! 调试导出的方法：在控制台中设置  window.open=$.get 即可查看请求响应过程。
		console.log("export: " + url);
		console.log("(HINT: debug via Ctrl-Export OR window.open=$.get)");
		if (debugShow) {
			$.get(url);
			return;
		}
		window.open(url);
	}
}

/**
@fn getQueryParamFromTable(jtbl, param?)
@alias getParamFromTable

根据数据表当前设置，获取查询参数。
可能会设置{cond, orderby, res, fname}参数。

res参数从列设置中获取，如"id 编号,name 姓名", 特别地，如果列对应字段以"_"结尾，不会加入res参数。

(v5.2)
如果表上有多选行，则导出条件为cond="t0.id IN (id1, id2)"这种形式。

fname自动根据当前页面的title以及datagrid当前的queryParam自动拼接生成。
如title是"检测记录报表", queryParam为"tm>='2020-1-1' and tm<='2020-7-1"，则生成文件名fname="检测记录报表-2020-1-1-2020-7-1".

@see getExportHandler 导出Excel
*/
self.getQueryParamFromTable = self.getParamFromTable = getQueryParamFromTable;
function getQueryParamFromTable(jtbl, param)
{
	var datagrid = self.isTreegrid(jtbl)? "treegrid": "datagrid";
	var opt = jtbl[datagrid]("options");

	var param1 = getDgFilter(jtbl); // param单独处理而不是一起合并，因为如果param.cond非空，不是做合并而是覆盖
	if (param != null) {
		$.extend(param1, param); // 保留param中内容，不修改param
	}
	else {
		param = {};
	}
	var selArr =  jtbl[datagrid]("getChecked");
	if (selArr.length > 1 && selArr[0].id != null) {
		var idList = $.map(selArr, function (e) { return e.id}).join(',');
		param1.cond = "t0.id IN (" + idList + ")";
	}
	if (param.orderby === undefined && opt.sortName) {
		param1.orderby = opt.sortName;
		if (opt.sortOrder && opt.sortOrder.toLowerCase() != "asc")
			param1.orderby += " " + opt.sortOrder;
	}
	if (param.res === undefined) {
		var resArr = [];
		$.each([opt.frozenColumns[0], opt.columns[0]], function (idx0, cols) {
			if (cols == null)
				return;
			$.each(cols, function (i, e) {
				if (! e.field || e.field.substr(-1) == "_")
					return;
				var one = e.field + " \"" + e.title + "\"";
				if (e.jdEnumMap) {
					one += '=' + mCommon.kvList2Str(e.jdEnumMap, ';', ':');
				}
				resArr.push(one);
			});
		});
		param1.res = resArr.join(',');
	}
	if (param.fname === undefined) {
		param1.fname = jtbl.prop("title") || jtbl.closest(".wui-page").prop("title");
		/*
		if (opt.queryParams && opt.queryParams.cond) {
			var keys = [];
			opt.queryParams.cond.replace(/'([^']+?)'/g, function (ms, ms1) {
				keys.push(ms1);
			});
			if (keys.length > 0) {
				param1.fname += "-" + keys.join("-");
			}
		}
		*/
	}
	return param1;
}

/**
@fn getDgInfo(jtbl, res?) -> { opt, isTreegrid, datagrid, url, param, ac, obj, sel?, selArr?, res?, dgFilter? }

取datagrid关联信息. 返回字段标记?的须显式指定，如：

	var dg = WUI.getDgInfo(jtbl); // {opt, url, ...}
	var dg = WUI.getDgInfo(jtbl, {res: null}); // 多返回res字段
	var data = jtbl[dg.datagrid]("getData"); // 相当于jtbl.datagrid(...), 但兼容treegrid调用。

- opt: 数据表option
- url: 关联的查询URL
- param: 额外查询参数
- ac: 关联的后端接口，比如"Ordr.query"
- obj: 关联的对象，比如"Ordr"
- isTreegrid: 是否为treegrid
- datagrid: "datagrid"或"treegrid"

- sel: 当前选中行的数据，无选中时为null
- selArr: 当前所有所中行的数据数据，无选中时为[]
- res: 字段信息，{ field => {field, title, jdEnumMap?} }
 */
self.getDgInfo = getDgInfo;
function getDgInfo(jtbl, res)
{
	if (!jtbl || jtbl.size() == 0 || !jtbl.hasClass("datagrid-f")) {
		console.error("bad datagrid: ", jtbl);
		throw "getDgInfo error: bad datagrid.";
	}

	if (res == null)
		res = {};

	res.isTreegrid = self.isTreegrid(jtbl);
	var datagrid = res.datagrid = (res.isTreegrid? "treegrid": "datagrid");
	var opt = res.opt = jtbl[datagrid]("options");
	res.url = opt.url;
	res.param = opt.queryParams;
	res.ac = opt.url && opt.url.action;
	if (res.ac) {
		var m = res.ac.match(/\w+(?=\.query\b)/);
		res.obj = m && m[0];
	}
	if (res.sel !== undefined) {
		res.sel = jtbl[datagrid]('getSelected');
	}
	if (res.selArr !== undefined) {
		res.selArr = jtbl[datagrid]("getChecked");
	}
	if (res.res !== undefined) {
		res.res = {};
		$.each([opt.frozenColumns[0], opt.columns[0]], function (idx0, cols) {
			if (cols == null)
				return;
			$.each(cols, function (i, e) {
				if (! e.field || e.field.substr(-1) == "_")
					return;
				res.res[e.field] = e;
			});
		});
	}
	if (res.dgFilter !== undefined) {
		res.dgFilter = getDgFilter(jtbl);
	}
	return res;
}

window.YesNoMap = {
	0: "否",
	1: "是"
};
window.YesNo2Map = {
	0: "否",
	1: "是",
	2: "处理中"
};

var Formatter = {
	dt: function (value, row) {
		var dt = WUI.parseDate(value);
		if (dt == null)
			return value;
		return dt.format("L");
	},
	number: function (value, row) {
		return parseFloat(value);
	},
/**
@fn Formatter.atts

列表中显示附件（支持多个）, 每个附件一个链接，点击后可下载该附件。（使用服务端att接口）
*/
	atts: function (value, row) {
		if (value == null)
			return "(无)";
		return value.toString().replace(/(\d+)(?::([^,]+))?,?/g, function (ms, attId, name) {
			var url = WUI.makeUrl("att", {id: attId});
			if (name == null)
				name = attId;
			return "<a target='_black' href='" + url + "'>" + name + "</a>&nbsp;";
		});
	},
/**
@fn Formatter.pics1

显示图片（支持多图）, 显示为一个链接，点击后在新页面打开并依次显示所有的图片。（使用服务端pic接口）
*/
	pics1: function (value, row) {
		if (value == null)
			return "(无图)";
		return '<a target="_black" href="' + WUI.makeUrl("pic", {id:value}) + '">' + value + '</a>';
	},
/**
@fn Formatter.pics

显示图片（支持多图）, 每个图有预览, 点击后在新页面打开并依次显示所有的图片.（使用服务端pic接口）
*/
	pics: function (value, row) {
		if (value == null)
			return "(无图)";
		var maxN = Formatter.pics.maxCnt || 3; // 最多显示图片数
		// value = value + "," + value + "," + value;
		value1 = value.toString().replace(/(\d+)(?::([^,]+))?,?/g, function (ms, picId, name) {
			if (name == null)
				name = "图" + picId;
			if (maxN <= 0)
				return name + " ";
			-- maxN;
			var url = WUI.makeUrl("att", {id: picId});
			return '<img alt="' + name + '" src="' + url + '">';
		});
		var linkUrl = WUI.makeUrl("pic", {id:value});
		return '<a target="_black" href="' + linkUrl + '">' + value1 + '</a>';
	},
/**
@fn Formatter.flag(yes, no)

显示flag类的值，示例：

	<th data-options="field:'clearFlag', sortable:true, formatter:Formatter.flag("已结算", "未结算"), styler:Formatter.enumStyler({1:'Disabled',0:'Warning'}, 'Warning')">结算状态</th>

注意flag字段建议用Formatter.enum和jdEnumMap，因为在导出表格时，只用flag的话，导出值还是0,1无法被转换，还不如定义一个Map来的更清晰。

@see datagrid.formatter
@see Formatter.enum
*/
	flag: function (yes, no) {
		if (yes == null)
			yes = "是";
		if (no == null)
			no = "否";
		return function (value, row) {
			if (value == null)
				return;
			return value? yes: no;
		}
	},
/**
@fn Formatter.enum(enumMap, sep=',')

将字段的枚举值显示为描述信息。示例：

		<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter: WUI.formatter.enum(OrderStatusMap)">状态</th>

如果状态值为"CR"，则显示为"未付款". 全局变量OrderStatusMap在代码中定义如下（一般在web/app.js中定义）

	var OrderStatusMap = {
		CR: "未付款", 
		PA: "待服务"
	}

常用的YesNoMap是预定义的`0-否,1-是`映射，示例：

	<th data-options="field:'clearFlag', sortable:true, jdEnumMap:YesNoMap, formatter:Formatter.enum(YesNoMap), styler:Formatter.enumStyler({1:'Disabled',0:'Warning'}, 'Warning')">已结算</th>

特别地，可以为null指定值：

	<th data-options="field:'name', sortable:true, formatter:Formatter.enum({null:'(默认)'})">页面名</th>

@see datagrid.formatter
@see Formatter.enumStyler
 */
	enum: function (enumMap, sep) {
		sep = sep || ',';
		return function (value, row) {
			if (value == null)
				return enumMap[value];
			var v = enumMap[value];
			if (v != null)
				return v;
			if (value.indexOf && value.indexOf(sep) > 0) {
				var v1 = $.map(value.split(sep), function(e) {
					return enumMap[e] || e;
				});
				v = v1.join(sep);
			}
			else {
				v = value;
			}
			return v;
		}
	},
/**
@fn Formatter.enumStyler(colorMap, defaultColor?, field?)

为列表的单元格上色，示例：

	<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter:Formatter.enum(OrderStatusMap), styler:Formatter.enumStyler({PA:'Warning', RE:'Disabled', CR:'#00ff00', null: 'Error'}), sortable:true">状态</th>

颜色可以直接用rgb表示如'#00ff00'，或是颜色名如'red'等，最常用是用系统预定的几个常量'Warning'（黄）, 'Error'（红）, 'Info'（绿）, 'Disabled'（灰）.
缺省值可通过defaultColor传入。

如果是根据其它字段来判断，使用field选项指定字段，示例: 显示statusStr字段，但根据status字段值来显示颜色（默认'Info'颜色）

	<th data-options="field:'statusStr', styler:Formatter.enumStyler({PA:'Warning'}, 'Info', 'status'), sortable:true">状态</th>

@see datagrid.styler
@see Formatter.enumFnStyler 比enumStyler更强大
 */
	enumStyler: function (colorMap, defaultColor, field) {
		return function (value, row) {
			if (field)
				value = row[field];
			var color = colorMap[value];
			if (color == null && defaultColor)
				color = defaultColor;
			if (Color[color])
				color = Color[color];
			if (color)
				return "background-color: " + color;
		}
	},
/**
@fn Formatter.enumFnStyler(colorMap, defaultColor)

为列表的单元格上色，示例：

	<th data-options="field:'id', sortable:true, sorter:intSort, styler:Formatter.enumFnStyler({'v<10': 'Error', 'v>=10&&v<20': 'Warning'}, 'Info')">编号</th>

每个键是个表达式（其实是个函数），特殊变量v和row分别表示当前列值和当前行。缺省值可通过defaultColor传入。

@see Formatter.enumStyler
 */
	enumFnStyler: function (colorMap, defaultColor) {
		// elem: [fn(v), key]
		var fnArr = $.map(colorMap, function (v0, k) {
			// 注意：这里函数参数为v和row，所以字符串中可为使用v表示传入值; 特殊键true表示匹配所有剩下的
			return [ [function (v, row) { return eval(k) }, v0] ];
		});
		console.log(fnArr);
		return function (value, row) {
			var color = null;
			$.each(fnArr, function (i, fn) {
				if (fn[0](value, row)) {
					color = fn[1];
					return false;
				}
			});
			if (color == null && defaultColor)
				color = defaultColor;
			
			if (Color[color])
				color = Color[color];
			if (color)
				return "background-color: " + color;
		}
	},
	// showField=false: 显示value
	// showField=true: 显示"{id}-{name}"
	// 否则显示指定字段
	linkTo: function (field, dlgRef, showField) {
		return function (value, row) {
			if (value == null)
				return;
			var val = typeof(showField)=="string"? row[showField]:
				showField? (row[field] + "-" + value): value;
			return self.makeLinkTo(dlgRef, row[field], val);
		}
	},

/**
@fn Formatter.progress

以进度条方式显示百分比，传入数值value为[0,1]间小数：

	<th data-options="field:'progress', formatter: Formatter.progress">工单进度</th>

如果要定制颜色等样式，可以加个styler，如

	<th data-options="field:'progress', formatter: Formatter.progress, styler: OrdrFormatter.progressStyler">工单进度</th>

通过为cell指定一个class来控制内部进度条样式：

	progressStyler: function (value, row) {
		var st = ... // 'info', 'error'
		return {class: st}; // 直接返回字符串表示styler; 也可以返回 {class, style}这样
	}

然后通过CSS类来改写进度条颜色：

	<style>
	.info .progressbar-value {
		background-color: rgb(190, 247, 190) !important;
	}
	.error .progressbar-value {
		background-color: rgb(253, 168, 172) !important;
	}
	</style>

 */
	progress: function (value, row) {
		if (! value)
			return;
		value = Math.ceil(value * 100);
		var htmlstr = '<div class="easyui-progressbar progressbar" style="min-width: 100px;width: 100%; height: 20px;">'
			+ '<div class="progressbar-value" style="width: ' + value + '%; height: 20px; line-height: 20px;"></div>'
			+ '<div class="progressbar-text" style="width: ' + value + '%; top: 0;">' + value+ '%</div>'
			+ '</div>';
		return htmlstr;
	}
};

/**
@var formatter = {dt, number, pics, flag(yes?=是,no?=否), enum(enumMap), linkTo(field, dlgRef, showId?=false) }

常常应用定义Formatter变量来扩展WUI.formatter，如

	var Formatter = {
		userId: WUI.formatter.linkTo("userId", "#dlgUser"), // 显示用户名(value)，点击后打开用户明细框
		storeId: WUI.formatter.linkTo("storeId", "#dlgStore", true), // 显示"商户id-商户名", 点击后打开商户明细框
		orderStatus: WUI.formatter.enum({CR: "新创建", CA: "已取消"}) // 将CR,CA这样的值转换为显示文字。
	};
	Formatter = $.extend(WUI.formatter, Formatter);

可用值：

- dt/number: 显示日期、数值
- pics/pics1: 显示一张或一组图片链接，点一个链接可以在新页面上显示原图片。(v5.4) pics直接显示图片(最多3张，可通过Formatter.pics.maxCnt设置)，更直观；pics1只显示图片编号，效率更好。
- atts: (v5.4) 显示一个或一组附件，点链接可下载附件。
- enum(enumMap): 根据一个map为枚举值显示描述信息，如 `enum({CR:"创建", CA:"取消"})`。
 (v5.1) 也支持枚举值列表，如设置为 `enumList({emp:"员工", mgr:"经理"})`，则会将"emp"和"emp,mgr"分别解析为"员工", "员工,经理"
- flag(yes?, no?): 显示yes-no字段，如 `flag("禁用","启用")`，也可以用enum，如`enum({0:"启用",1:"禁用"})`
- linkTo: 生成链接，点击打开对象详情对话框

在datagrid中使用：

	<th data-options="field:'createTm', sortable:true, formatter:Formatter.dt">创建时间</th>
	<th data-options="field:'amount', sortable:true, sorter: numberSort, formatter:Formatter.number">金额</th>
	<th data-options="field:'userName', sortable:true, formatter:Formatter.linkTo('userId', '#dlgUser')">用户</th>
	<th data-options="field:'status', sortable:true, jdEnumMap: OrderStatusMap, formatter: Formatter.orderStatus">状态</th>
	<th data-options="field:'done', sortable:true, formatter: Formatter.flag()">已处理</th>
*/
self.formatter = Formatter;

// ---- easyui setup {{{

$.extend($.fn.combobox.defaults, {
	valueField: 'val',
	textField: 'text'
});

function dgLoader(param, success, error)
{
	var jo = $(this);
	var datagrid = self.isTreegrid(jo)? "treegrid": "datagrid";
	var opts = jo[datagrid]("options");
	if (opts.data) {
		return defaultDgLoader[datagrid].apply(this, arguments);
	}
	if (opts.url == null)
		return false;
	var param1 = {};
	for (var k in param) {
		if (k === "rows") {
			param1.pagesz = param[k];
		}
	/*  param page is supported by jdcloud
		else if (k === "page") {
			param1.page = param[k];
		}
	*/
		else if (k === "sort") {
			param1.orderby = param.sort + " " + param.order;
		}
		else if (k === "order") {
		}
		else {
			param1[k] = param[k];
		}
	}

	// PAGE_FILTER 根据showPage参数自动对页面中的datagrid进行过滤: 
	// WUI.showPage(pageName, title, [param1, {cond:cond}]) 
	param1 = getDgFilter(jo, param1, true); // 设置ignoreQueryParam=true因为param1中已包含了queryParams，不忽略的话条件会重复

	var dfd = self.callSvr(opts.url, param1, success);
	dfd.fail(function () {
		// hide the loading icon
		jo[datagrid]("loaded");
	});
}

/**
@key datagrid.sumFields 数据表统计列

为datagrid扩展属性，用于在数据表底部显示统计值。
默认统计逻辑是当前页面内累加，如：

	var dgOpt = {
		url: WUI.makeUrl("Contract.query"),
		showFooter: true, // 指定要显示底部统计
		sumFields: ["amount", "invoiceAmount", "recvAmount"], // 指定哪些列加统计值
		...
	});
	jtbl.datagrid(dgOpt);

如果想跨页统计，即显示所有页数据的统计（在当前查询条件下），需要为query调用添加statRes参数，如：

	var dgOpt = {
		url: WUI.makeUrl("Contract.query", {
			// 指定返回amount, invoiceAmount两个统计列
			statRes: "SUM(amount) amount, SUM(invoiceAmount) invoiceAmount",
		}),
		showFooter: true, // 指定要显示底部统计
		sumFields: ["amount", "invoiceAmount", "recvAmount"], // 注意：此时amount,invoiceAmount由于在statRes中指定，是跨页数据统计，而recvAmount未在statRes中指定，则只统计当前显示页。
		...
	});
	jtbl.datagrid(dgOpt);

*/

function dgLoadFilter(data)
{
	var ret = jdListToDgList(data);
	var isOnePage = (ret.total == ret.rows.length);
	// 隐藏pager: 一页能显示完且不超过5条.
	$(this).datagrid("getPager").toggle(! (isOnePage && ret.total <= 5));
	// 超过1页使用remoteSort, 否则使用localSort.
//	$(this).datagrid("options").remoteSort = (! isOnePage);

	var dgOpt = $(this).datagrid("options");
	// 支持统计列计算。TODO: 允许自定义统计逻辑与格式
	if (dgOpt.showFooter && dgOpt.sumFields) {
		var stat = data.stat || {};
		dgOpt.sumFields.forEach(function (field) {
			if (stat[field] !== undefined)
				return;
			stat[field] = ret.rows.reduce(function (s, row, i) {
				var v = row[field];
				if (!v || isNaN(v))
					return s;
				return s + parseFloat(v);
			}, 0);
		});
		ret.footer = [stat];
	}
	return ret;
}

function resetPageNumber(jtbl)
{
	var opt = jtbl.datagrid('options');
	if (opt.pagination && opt.pageNumber)
	{
		opt.pageNumber = 1;
		var jpager = jtbl.datagrid("getPager");
		jpager.pagination("refresh", {pageNumber: opt.pageNumber});
	}
}

/**
@key datagrid.quickAutoSize

扩展属性quickAutoSize。当行很多且列很多时，表格加载极慢。如果是简单表格（全部列都显示且自动大小，没有多行表头等），可以用这个属性优化。
在pageSimple中默认quickAutoSize为true。

	var dgOpt = {
		...
		pageSize: 200, // 默认一页20，改为200后，默认性能将显著下降; 设置为500后，显示将超过10秒
		pageList: [200, 500, 1000],
		quickAutoSize: true // WUI对easyui-datagrid的扩展属性，用于大量列时提升性能. 参考: jquery.easyui.min.js
	};
	jtbl.datagrid(dgOpt);

其原因是easyui-datagrid的autoSizeColumn方法有性能问题。当一页行数很多时可尝试使用quickAutoSize选项。
*/
var defaultDgLoader = {
	datagrid: $.fn.datagrid.defaults.loader,
	treegrid: $.fn.treegrid.defaults.loader
}
$.extend($.fn.datagrid.defaults, {
// 		fit: true,
// 		width: 1200,
// 		height: 800,
// 		method: 'POST',

	rownumbers:true,
	//singleSelect:true,
	ctrlSelect: true, // 默认是单选，按ctrl或shift支持多选

// 	pagination: false,
	pagination: true,
	pageSize: 20,
	pageList: [20,50,100],

	loadFilter: dgLoadFilter,
	loader: dgLoader,

	onLoadError: self.ctx.defAjaxErrProc,
	onBeforeSortColumn: function (sort, order) {
		var jtbl = $(this);
		resetPageNumber(jtbl);
	},

	onLoadSuccess: function (data) {
		if (data.total) {
			// bugfix: 有时无法显示横向滚动条
			$(this).datagrid("fitColumns");
		}
		else {
/**
@key .noData

CSS类, 可定义无数据提示的样式
 */
			// 提示"无数据". 在sytle.css中定义noData类
			var body = $(this).data().datagrid.dc.body2;
			var view =  $(this).data().datagrid.dc.view;
			var h = 50;
			view.height(view.height() - body.height() + h);
			body.height(h);
			body.find('table tbody').empty().append('<tr><td width="' + body.width() + 'px" height="50px" align="center" class="noData" style="border:none; color:#ccc; font-size:14px">没有数据</td></tr>');
		}
	},

	// 右键点左上角空白列:
	onHeaderContextMenu: function (ev, field) {
		var jtbl = $(this);
		var jmenu = GridHeaderMenu.showMenu({left: ev.pageX, top: ev.pageY, field}, jtbl, field);

		ev.preventDefault();
	},

	onClickCell: function (row, field, val) {
		var this_ = this;
		var jtbl = $(this);

		// 多选时显示列统计信息，一段时间内只显示一次
		if (this_.infoTmr)
			clearTimeout(this_.infoTmr);
		this_.infoTmr = setTimeout(function () {
			GridHeaderMenu.statSelection(jtbl, row, field);
			delete this_.infoTmr;
		}, 1000);
	},

	onInitOptions: function (opt) {
		var ac = opt.url && opt.url.action;
		if (ac) {
			var m = ac.match(/\w+(?=\.query\b)/);
			var obj = m && m[0];
			if (obj) {
				opt.obj = obj;
				var meta = self.UDF.onGetMeta(obj);
				if (meta && meta.defaultFlag) { // 防止对话框上的datagrid重复添加字段
					self.UDF.addColByMeta(opt.columns[0], meta);
				}
			}
		}
	},

	// Decided in dgLoadFilter: 超过1页使用remoteSort, 否则使用localSort.
	// remoteSort: false

// 	// 用于单选并且不清除选择, 同时取data("sel")可取到当前所选行号idx。this = grid
// 	onSelect: function (idx, data) {
// 		$(this).data("sel", idx);
// 	},
// 	onUnselect: function (idx, data) {
// 		if (idx === $(this).data("sel"))
// 			$(this).datagrid("selectRow", idx);
// 	}
});

/**
@var GridHeaderMenu

表头左上角右键菜单功能。

扩展示例：

	WUI.GridHeaderMenu.items.push('<div id="showObjLog">操作日志</div>');
	WUI.GridHeaderMenu.showObjLog = function (jtbl) {
		var row = WUI.getRow(jtbl);
		if (!row)
			return;
		...
		WUI.showPage("pageObjLog", "操作日志!", [null, param]);
	};

*/
var GridHeaderMenu = {
	showMenu: function (pos, jtbl, field) {
		// 注意id与函数名的匹配
		jmenu = $('<div class="mnuGridHeader"></div>');
		var items = field? GridHeaderMenu.itemsForField: GridHeaderMenu.items;
		$.each(items, function (i, e) {
			var je = $(e);
			var perm = je.attr("wui-perm") || je.text();
			if (canDo("通用", perm))
				je.appendTo(jmenu);
		});
		jmenu.menu({
			onClick: function (mnuItem) {
				GridHeaderMenu[mnuItem.id].call(mnuItem, jtbl, field);
			}
		});
		jmenu.menu('show', pos);
	},
	// 表头左侧右键菜单
	items: [
		'<div id="showDlgFieldInfo">字段信息</div>',
		'<div id="showDlgDataReport" data-options="iconCls:\'icon-sum\'">自定义报表</div>',
		'<div id="showDlgQuery" data-options="iconCls:\'icon-search\'">自定义查询</div>',
		'<div id="import" wui-perm="新增" data-options="iconCls:\'icon-add\'">导入</div>',
		'<div id="export" data-options="iconCls:\'icon-save\'">导出</div>'
	],
	// 列头右键菜单
	itemsForField: [
		'<div id="copyCol">复制本列</div>',
		'<div id="statCol" data-options="iconCls:\'icon-sum\'">统计本列</div>',
		'<div id="doFindCell" data-options="iconCls:\'icon-search\'">查询本列</div>',
	],
	// 以下为菜单项处理函数

	showDlgFieldInfo: function (jtbl) {
		var param = WUI.getQueryParamFromTable(jtbl);
		console.log(param);

		var title = "字段信息";
		var title1 = jtbl.prop("title") || jtbl.closest(".wui-page").prop("title");
		if (title1)
			title += "-" + title1;

		var strArr = [];
		var datagrid = WUI.isTreegrid(jtbl)? "treegrid": "datagrid";
		var url = jtbl[datagrid]("options").url;
		if (url && url.action)
			strArr.push("<b>[接口]</b>\n" + url.action);
		if (param.cond)
			strArr.push("<b>[查询条件]</b>\n" + param.cond);
		if (param.orderby)
			strArr.push("<b>[排序]</b>\n" + param.orderby);
		strArr.push("<b>[字段列表]</b>\n" + param.res.replace(/,/g, "\n"));

		var jdlg = $("<div title='" + title + "'><pre>" + strArr.join("\n\n") + "</pre></div>");
		WUI.showDlg(jdlg, {
			modal: false,
			onOk: function () {
				WUI.closeDlg(this);
			},
			noCancel: true
		});
	},

	showDlgDataReport: function (jtbl) {
		self.showDlg("#dlgDataReport");
	},
	showDlgQuery: function (jtbl) {
		var data = null;
		var datagrid = WUI.isTreegrid(jtbl)? "treegrid": "datagrid";
		var url = jtbl[datagrid]("options").url;
		if (url && url.action)
			data = {ac: url.action};
		var param = WUI.getQueryParamFromTable(jtbl);
		self.showDlgQuery(data, param);
	},
	'import': function (jtbl) {
		var param = self.getDgInfo(jtbl);
		if (!param.obj) {
			app_alert("该数据表不支持导入", "w");
			return;
		}
		DlgImport.show({obj: param.obj}, function () {
			WUI.reload(jtbl);
		});
	},
	'export': function (jtbl) {
		var fn = getExportHandler(jtbl);
		fn();
	},

	dgStatCol: function (rows, field) {
		var stat = {cnt: 0, realCnt: 0, numCnt: 0, sum: 0, max: 0, min: 0, info: []};
		stat.cnt = rows.length;
		if (stat.cnt < 1)
			return stat;
		rows.forEach(function (e) {
			var v = e[field];
			if (v === null || v === "")
				return;
			++ stat.realCnt;

			if (isNaN(v))
				return;
			if (v.constructor !== Number) {
				v = parseFloat(v);
			}
			++ stat.numCnt;
			if (stat.numCnt == 1) {
				stat.max = v;
				stat.min = v;
				stat.sum = v;
			}
			else {
				stat.sum += v;
				if (v > stat.max)
					stat.max = v;
				if (v < stat.min)
					stat.min = v;
			}
		});
		stat.info = [
			"COUNT=" + stat.cnt,
			"COUNT(非空项)=" + stat.realCnt
		];
		if (stat.numCnt > 0) {
			stat.info.push(
				"COUNT(数值项)=" + stat.numCnt,
				"SUM=" + stat.sum,
				"MAX=" + stat.max,
				"MIN=" + stat.min,
				"AVG=" + stat.sum/stat.numCnt
			)
		}
		return stat;
	},

	statSelection: function (jtbl, row, field) {
		var rows = jtbl.datagrid("getSelections");
		if (rows.length < 2)
			return;
		var stat = GridHeaderMenu.dgStatCol(rows, field);
		var colTitle = jtbl.datagrid("getColumnOption", field).title;
		var title = "选中" + rows.length + "行，列=[" + colTitle + "]";
		app_show(stat.info.join("<br>"), title);
	},

	copyCol: function (jtbl, field) {
		var rows = jtbl.datagrid("getSelections");
		var arr = null;
		if (rows.length < 2) { // 非多选时，复制本列所有数据（包含标题行）
			var data = jtbl.datagrid("getData");
			arr = data.rows.map(function (e) {
				return e[field];
			});
			var colTitle = jtbl.datagrid("getColumnOption", field).title;
			arr.unshift(colTitle);
		}
		else { // 多选时，只复制已选择行的列数据
			arr = rows.map(function (e) {
				return e[field];
			});
		}
		var ret = arr.join("\r\n");
		self.execCopy(ret);
	},
	statCol: function (jtbl, field) {
		var data = jtbl.datagrid("getData");
		var colTitle = jtbl.datagrid("getColumnOption", field).title;
		if (data.rows.length == 0) {
			var info = "[" + colTitle + "]列: 无数据";
			app_alert(info);
			return;
		}
		var stat = GridHeaderMenu.dgStatCol(data.rows, field);
		stat.info.unshift("<b>[" + colTitle + "]</b>列:");
		var jdlg = $("<div title='列统计'><pre>" + stat.info.join("\n") + "</pre></div>");
		WUI.showDlg(jdlg, {
			modal: false,
			onOk: function () {
				WUI.closeDlg(this);
			},
			noCancel: true
		});
	},
	doFindCell: function (jtbl, field) {
		var row = WUI.getRow(jtbl);
		if (row == null)
			return;
		
		var param = {cond: {} }
		param.cond[field] = row[field];
		var doAppendFilter = WUI.isBatchMode();
		WUI.reload(jtbl, undefined, param, doAppendFilter);
		console.log("查询(按住Ctrl点击可追加查询条件): ", param.cond);
	}
}
self.GridHeaderMenu = GridHeaderMenu;

/**
@fn showDlgQuery(data?={ac, param})
 */
self.showDlgQuery = showDlgQuery;
function showDlgQuery(data1, param)
{
	var itemArr = [
		// title, dom, hint?
		{title: "接口名", dom: "<input name='ac' required>", hint: "示例: Ordr.query"},
		{title: "参数", dom: '<textarea name="param" rows=8></textarea>', hint: "cond:查询条件, res:返回字段, gres:分组字段, pivot:转置字段, fmt:输出格式(html,excel,txt,list,array,csv等)"}
	];
	var data = $.extend({
		ac: 'Ordr.query',
		param: param ? JSON.stringify(param, null, 2) :  '{\n cond: {createTm: ">2020-1-1"},\n res: "count(*) 数量",\n gres: "status 状态=CR:新创建;PA:待处理;RE:已完成;CA:已取消",\n// pivot: "状态"\n}'
	}, data1);
	self.showDlgByMeta(itemArr, {
		title: "高级查询",
		modal: false,
		data: data,
		onOk: function (data) {
			var param = {page: 1};
			if (data.param) {
				try {
					param = $.extend(param, eval("(" + data.param + ")"));
				}
				catch (ex) {
					app_alert("参数格式出错：须为JS对象格式");
					return false;
				}
			}
			var url = self.makeUrl(data.ac, param);
			if (param && param.fmt) {
				window.open(url);
				return;
			}
			WUI.showPage("pageSimple", "查询结果!", [ url ]);
//			WUI.closeDlg(this);
		}
	});
}

$.extend($.fn.treegrid.defaults, {
	idField: "id",
	treeField: "id", // 只影响显示，在该字段上折叠
	pagination: false,
	rownumbers:true,
	fatherField: "fatherId", // 该字段为WUI扩展，指向父节点的字段
	singleSelect: false,
	ctrlSelect: true, // 默认是单选，按ctrl或shift支持多选
	loadFilter: function (data, parentId) {
		var opt = $(this).treegrid("options");
		var isLeaf = opt.isLeaf;
		var ret = jdListToTree(data, opt.idField, opt.fatherField, parentId, isLeaf);
		return ret;
	},
	loader: dgLoader,
	onBeforeLoad: function (row, param) {
		if (row) { // row非空表示展开父结点操作，须将param改为 {cond?, id} => {cond:"fatherId=1"}
			var opt = $(this).treegrid("options");
			param.cond = opt.fatherField + "=" + row.id;
			delete param["id"];
		}
	},
	onLoadSuccess: function (row, data) {
		// 空数据显示优化
		$.fn.datagrid.defaults.onLoadSuccess.call(this, data);
	},
	onHeaderContextMenu: $.fn.datagrid.defaults.onHeaderContextMenu
});

$.extend($.fn.combotree.defaults, {
	idField: "id",
	textField: "name",
	fatherField: "fatherId", // 该字段为WUI扩展，指向父节点的字段
	loadFilter: function (data, parentId) {
		var arr = null;
		// support simple array
		if ($.isArray(data)) {
			arr = data;
		}
		else if ($.isArray(data.list)) {
			arr = data.list;
		}
		// support compressed table format: {h,d}
		else if (data.h !== undefined)
		{
			arr = WUI.rs2Array(data);
		}
		else {
			return data;
		}
		var opt = $(this).tree("options"); // NOTE: 这里this似乎是tree; 用combotree/combo都取不了
		var ret = WUI.makeTree(arr, opt.idField, opt.fatherField);
		$.each(arr, function (i, e) {
			e.text = e[opt.textField];
		// e.state = 'closed'; // 如果无结点, 则其展开时将触发ajax查询子结点
		});
		return ret;
	}
});

$.extend($.fn.combogrid.defaults, {
	loadFilter: $.fn.datagrid.defaults.loadFilter,
	loader: $.fn.datagrid.defaults.loader,
});

$.extend($.fn.combotreegrid.defaults, {
	idField: "id",
	treeField: "name",
	textField: "name",
	fatherField: "fatherId", // 该字段为WUI扩展，指向父节点的字段
	loadFilter: $.fn.treegrid.defaults.loadFilter
});

/*
function checkIdCard(idcard)
{
	if (idcard.length != 18)
		return false;

	if (! /\d{17}[0-9x]/i.test(idcard))
		return false;

	var a = idcard.split("");
	var w = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
	var s = 0;
	for (var i=0; i<17; ++i)
	{
		s += a[i] * w[i];
	}
	var x = "10x98765432".substr(s % 11, 1);
	return x == a[17].toLowerCase();
}
*/
/**
@key .easyui-validatebox

为form中的组件加上该类，可以限制输入类型，如：

	<input name="amount" class="easyui-validatebox" data-options="required:true,validType:'number'" >

validType还支持：

- number: 数字
- uname: 4-16位用户名，字母开头
- cellphone: 11位手机号
- datetime: 格式为"年-月-日 时:分:秒"，时间部分可忽略

其它自定义规则(或改写上面规则)，可通过下列方式扩展：

	$.extend($.fn.validatebox.defaults.rules, {
		workday: {
			validator: function(value) {
				return value.match(/^[1-7,abc]+$/);
			},
			message: '格式例："1,3a,5b"表示周一,周三上午,周五下午.'
		}
	});

*/
var DefaultValidateRules = {
	number: {
		validator: function(v) {
			return v.length==0 || /^[0-9.-]+$/.test(v);
		},
		message: '必须为数字!'
	},
	/*
	workday: {
		validator: function(value) {
			return value.match(/^[1-7,abc]+$/);
		},
		message: '格式例："1,3a,5b"表示周一,周三上午,周五下午.'
	},
	idcard: {
		validator: checkIdCard,
		message: '18位身份证号有误!'
	},
	*/
	uname: {
		validator: function (v) {
			return v.length==0 || (v.length>=4 && v.length<=16 && /^[a-z]\w+$/i.test(v));
		},
		message: "4-16位英文字母或数字，以字母开头，不能出现符号."
	},
	pwd: {
		validator: function (v) {
			return v.length==0 || (v.length>=4 && v.length<=16) || v.length==32; // 32 for md5 result
		},
		message: "4-16位字母、数字或符号."
	},
	equalTo: {
		validator: function (v, param) { // param: [selector]
			return v.length==0 || v==$(param[0]).val();
		},
		message: "两次输入不一致."
	},
	cellphone: {
		validator: function (v) {
			return v.length==0 || (v.length==11 && !/\D/.test(v)); // "
		},
		message: "手机号为11位数字"
	},
	datetime: {
		validator: function (v) {
			return v.length==0 || /\d{4}-\d{1,2}-\d{1,2}( \d{1,2}:\d{1,2}(:\d{1,2})?)?/.test(v);
		},
		message: "格式为\"年-月-日 时:分:秒\"，时间部分可忽略"
	},
	usercode: {
		validator: function (v) {
			return v.length==0 || /^[a-zA-Z]/.test(v) || (v.length==11 && !/\D/.test(v)); 
		},
		message: "11位手机号或客户代码"
	}
};

var validateboxDefaults = {
	rules: DefaultValidateRules,
	validateOnCreate: false,
	missingMessage: "必填项，不可为空"
}
$.extend(true, $.fn.validatebox.defaults, validateboxDefaults);
$.extend(true, $.fn.combo.defaults, validateboxDefaults);
$.extend(true, $.fn.combogrid.defaults, validateboxDefaults);

// tabs自动记住上次选择
/*
$.extend($.fn.tabs.defaults, {
	onSelect: function (title) {
		var t = this.closest(".easyui-tabs");
		var stack = t.data("stack");
		if (stack === undefined) {
			stack = [];
			t.data("stack", stack);
		}
		if (title != stack[stack.length-1]) {
			var idx = stack.indexOf(title);
			if (idx >= 0) 
				stack.splice(idx, 1);
			stack.push(title);
		}
	},
	onClose: function (title) {
		var t = this.closest(".easyui-tabs");
		var stack = t.data("stack");
		var selnew = title == stack[stack.length-1];
		var idx = stack.indexOf(title);
		if (idx >= 0)
			stack.splice(idx, 1);
		if (selnew && stack.length >0) {
			// 向上找到tabs
			$(t).tabs("select", stack[stack.length-1]);
		}
	}
});
*/

/*
datagrid options中的toolbar，我们使用代码指定方式，即

	var btnFind = {text:'查询', iconCls:'icon-search', handler: function () {
		showObjDlg(ctx.jdlg, FormMode.forFind, {jtbl: ctx.jtbl});
	};
	jtbl.datagrid({ ... 
		toolbar: WUI.dg_toolbar(jtbl, jdlg, ... btnFind)
	});

缺点是它只能使用默认的linkbutton组件（在easyui里写死了）。
此处进行hack，增加class属性，让它支持splitbutton/menubutton，示例：

	var jmneu = $('#mm').menu({
		onClick: function (item) {
			console.log(item.id);
		}
	});
	var btnFind = {text:'查询', class: 'splitbutton', iconCls:'icon-search', handler: ..., menu: jmenu};

@key easyui-linkbutton
@key EXT_LINK_BUTTON
*/
$.fn.linkbutton0 = $.fn.linkbutton;
$.fn.linkbutton = function (a, b) {
	if ($.isPlainObject(a) && a.class) {
		mCommon.assert(a.class == "splitbutton" || a.class == "menubutton");
		var cls = a.class;
		delete a.class;
		return $.fn[cls].apply(this, arguments);
	}
	return $.fn.linkbutton0.apply(this, arguments);
}
$.extend($.fn.linkbutton, $.fn.linkbutton0);
// }}}

// 支持自动初始化mycombobox
self.m_enhanceFn[".my-combobox"] = function (jo) {
	jo.mycombobox();
};
/**
@key .wui-form-table

在wui-dialog上，对于form下直接放置的table，一般用于字段列表排列，框架对它添加类wui-form-table并自动对列设置百分比宽度，以自适应显示。

在非对话框上，也可手工添加此类来应用该功能。

 */
self.m_enhanceFn[".wui-form-table"] = enhanceTableLayout;
function enhanceTableLayout(jo) {
	var tbl = jo[0];
	if (tbl.rows.length == 0)
		return;
	var tr = tbl.rows[0];
	var colCnt = tr.cells.length;
	var doAddTr = false;
	// 考虑有colspan的情况
	for (var j=0; j<tr.cells.length; ++j) {
		var td = tr.cells[j];
		if (td.getAttribute("colspan") != null) {
			colCnt += parseInt(td.getAttribute("colspan"))-1;
			doAddTr = true;
		}
	}
	// 如果首行有colspan，则添加隐藏行定宽
	if (doAddTr) {
		var td = dup("<td></td>", colCnt);
		$('<tr class="wui-form-table-tr-width" style="visibility:hidden">' + td + '</tr>').prependTo(jo);
		tr = tbl.rows[0];
	}
	// 输入框等分
	var w = 100 / (colCnt/2);
	for (var i=1; i<colCnt; i+=2) {
		var je = $(tr.cells[i]);
		if (je.attr("width") == null)
			je.attr("width", w + "%");
		je.css("min-width", "100px");
	}

	/*
	2s内三击字段标题，触发查询。Ctrl+三击为追加过滤条件
	 */
	self.doSpecial(jo, 'td', function (ev) {
		var jo = $(this).next();
		if (jo.find("[name]").size() > 0) {
			var appendFilter = (ev.ctrlKey || ev.metaKey);
			doFind(jo, null, appendFilter);
		}
	}, 3, 2);

	function dup(s, n) {
		var ret = '';
		for (var i=0; i<n; ++i) {
			ret += s;
		}
		return ret;
	}
};

function main()
{
	self.title = document.title;
	self.container = $(".wui-container");
	if (self.container.size() == 0)
		self.container = $(document.body);
	self.enhanceWithin(self.container);

	// 在muiInit事件中可以调用showPage.
	self.container.trigger("wuiInit");

// 	// 根据hash进入首页
// 	if (self.showFirstPage)
// 		showPage();
}

$(main);

}

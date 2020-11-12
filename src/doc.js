/**
@module WUI

筋斗云前端框架-Web应用桌面版

此框架实现与筋斗云服务端接口的无缝整合。在界面上以jquery-easyui库为基础展示列表、Tab页等。
参考应用 web/store.html - 商户管理端应用。

## 对象管理功能

设计模式：列表页与详情页。

以订单对象Order为例：为订单对象增加“列表页”和“详情页”。

列表页应包含分页功能，默认只显示“未完成”订单。
点击列表中一项（一个订单），可显示详情页，即订单详情，并可进行查找、更新等功能。

### 定义列表页和详情页

@key #my-pages  包含所有页面、对话框定义的容器。
@key my-obj DOM属性，标识服务端对象
@key my-initfn DOM属性，标识页面或对话框的初始化函数，首次显示页面/对话框时调用。

列表页使用逻辑页面定义如下（放在div#my-pages之下），它最终展示为一个tab页：

	<div id="my-pages" style="display:none">
		...
		<script type="text/html" id="tpl_pageOrder">
			<div class="pageOrder" title="订单管理" my-initfn="initPageOrder">
				<table id="tblOrder" style="width:auto;height:auto">
					<thead><tr>
						<th data-options="field:'id', sortable:true, sorter:intSort">订单号</th>
						<th data-options="field:'userPhone', sortable:true">用户联系方式</th>
						<th data-options="field:'createTm', sortable:true">创建时间</th>
						<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter:Formatter.enum(OrderStatusMap), styler:Formatter.enumStyler({PA:'Warning'}), sortable:true">状态</th>
						<th data-options="field:'dscr', sortable:true">描述</th>
						<th data-options="field:'cmt'">用户备注</th>
					</tr></thead>
				</table>
			</div>
		</script>
	</div>

注意：

- 逻辑页的定义建议放在script标签中，便于按需加载，性能更佳（后面模块化时还会讲到放到单独文件中）。模板id为"tpl_pageOrder"，应与页面名相对应，否则无法加载。
- 逻辑页面div.pageOrder，属性class="pageOrder"定义了该逻辑页面的名字。它将作为页面模板，在WUI.showPage("pageOrder")时复制一份显示出来。
- 属性my-initfn定义了该页面的初始化函数. 在初次调用WUI.showPage时，会执行该初始化函数，用于初始化列表，设定事件处理等。
- 逻辑页面下包含了一个table，用于显示订单列表。里面每列对应订单的相关属性。
- table由jquery-easyui的datagrid组件实现，文档参考：http://www.jeasyui.com/documentation/datagrid.php 此外，data-options中的以jd开头的字段为jdcloud框架定义。

详情页展示为一个对话框，也将它也放在 div#my-pages 下。定义如下（此处为展示原理已简化）：

	<script type="text/html" id="tpl_dlgOrder">
		<div id="dlgOrder" my-obj="Ordr" my-initfn="initDlgOrder" title="用户订单" style="width:520px;height:500px;">  
			<form method="POST">
				订单号：<input name="id" disabled></td>
				订单状态：
						<select name="status">
							<option value="">&nbsp;</option>
							<option value="CR">未付款</option>
							<option value="PA">待服务(已付款)</option>
							<option value="ST">正在服务</option>
							<option value="RE">已服务(待评价)</option>
							<option value="RA">已评价</option>
							<option value="CA">已取消</option>
						</select>
			用户备注：<textarea name="cmt" rows=3 cols=30></textarea>
			</form>
		<div>
	</script>

注意：

- 对话框的定义建议放在script标签中，便于按需加载，性能更佳（后面模块化时还会讲到放到单独文件中）。模板id为"tpl_dlgOrder"应与对话框名相应，否则无法加载。
- 对话框div#dlgOrder. 与列表页使用class标识名称不同，详情页对话框以id标识（因为全局共用一个对话框，而列表页可以复制为多个同时显示）。
- 对话框上定义了 "my-obj"属性，用于标识它对应的服务端对象名。对象增删改查操作都会用到它。
- 对话框的属性 my-initfn 定义了初始化函数，在首次显示时调用。
- 调用 WUI.showObjDlg($("#dlgOrder"), formMode) 可显示该对话框，一般由列表页自动调用。
- 对话框中包含一个form用于向服务端发起请求。form中每个带name属性的对象，都对应订单对象的一个属性，在添加、查找、显示或更新时都将用到，除非它上面加了disabled属性（这样就不会提交该字段）
- 对话框一般不用加“提交”按钮，框架会自动为它添加“确定”、“取消”按钮。

@see showObjDlg
@see showDlg

以上定义了订单对象的列表页和详情页，围绕对象"Order", 按规范，我们定义了以下名字：

- 列表页面（Tab页） div.pageOrder，列表 table#tblOrder，页面初始化函数 initPageOrder
- 详情页（对话框）div#dlgOrder，其中包含一个form。对话框初始化函数

### 添加入口按钮

	<a href="#pageOrder" class="easyui-linkbutton" icon="icon-ok">订单管理</a><br/><br/>

### 定义页面初始化函数

打开页面后，页面的生存周期如下：

@key event-pagecreate,pageshow,pagedestroy 页面事件
@key wui-pageName 属性：页面名
@key .wui-page 页面类

- 页面加载成功后，会为页面添加类"wui-page", 并将属性wui-pageName设置为页面名，然后调用 my-initfn指定的初始化函数，如initPageOrder
- 触发pagecreate事件
- 触发pageshow事件, 以后每次页面切换到当前页面，也会触发pageshow事件。
- 在关闭页面时，触发pagedestroy事件
- 注意：没有pagebeforeshow, pagehide事件

订单列表页的初始化，需要将列表页(代码中jpage)、列表(代码中jtbl)与详情页(代码中jdlg)关联起来，实现对话增删改查各项功能。

	function initPageOrder() 
	{
		var jpage = $(this);
		var jtbl = jpage.find("#tblOrder");
		var jdlg = $("#dlgOrder");

		// 注意：此处定义显示哪些缺省操作按钮：
		// r-refresh/刷新, f-find/查找, s-set/更新。参考 WUI.dg_toolbar.
		// 如果不定义则所有操作按钮都展示。
		jtbl.jdata().toolbar = "rfs";

		// 当天订单
		var query1 = {cond: "createTm between '" + new Date().format("D") + "' and '" + new Date().addDay(1).format("D") + "'"};
		// var query1 = WUI.getQueryParam({createTm: new Date().format("D") + "~" + new Date().addDay(1).format("D")});
		// 显示待服务/正在服务订单
		var query2 = {cond: "status='CR' OR status='PA' OR status='ST'"};
		// var query2 = WUI.getQueryParam({status: "CR,PA,ST"});

		function getTodoOrders()
		{
			WUI.reload(jtbl, null, query2);
		}
		function getTodayOrders()
		{
			WUI.reload(jtbl, null, query1);
		}
		var btn1 = {text: "今天订单", iconCls:'icon-search', handler: getTodayOrders};
		var btn2 = {text: "所有未完成", iconCls:'icon-search', handler: getTodoOrders};

		var dgOpt = {
			// 设置查询接口
			url: WUI.makeUrl(["Ordr", "query"], {res:"*,createTm,userPhone"}),
			// 设置缺省查询条件
			queryParams: query1,
			// 设置工具栏上的按钮，默认有增删改查按钮，"export"表示"导出到Excel"的按钮，btn1, btn2是自定义按钮，"-"表示按钮分隔符。
			toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", "-", btn1, btn2),
			// 双击一行，应展示详情页对话框
			onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
		};
		jtbl.datagrid(dgOpt);
	}

@see showPage
@see dg_toolbar
@see dg_dblclick
@see makeUrl

### 定义对话框的初始化函数

@key example-dialog

默认对话框中由于设定了底层对象(my-obj)及属性关联（form中带name属性的组件，已关联对象属性），因而可自动显示和提交数据。

特别地，某些属性不宜直接展示，例如属性“人物头像”，服务器存储的是图片id(picId)，而展示时应显示为图片而不是一个数字；
或者如“权限列表”属性，服务器存储的是逗号分隔的一组权限比如"emp,mgr"，而展示时需要为每项显示一个勾选框。
这类需求就需要编码控制。

相关事件：
@see beforeshow,show 对话框中form显示前后

对话框类名：
@see .wui-dialog

	function initDlgOrder()
	{
		var jdlg = $(this);
		jdlg.on("beforeshow", onBeforeShow)
			.on("show", onShow)
			.on("validate", onValidate)
			.on("retdata", onRetData);
		
		function onBeforeShow(ev, formMode, opt) {
			// beforeshow用于设置字段是否隐藏、是否可编辑；或是设置opt(即WUI.showDlg的opt)。

			var objParam = opt.objParam;
			var forAdd = formMode == FormMode.forAdd;
			var forSet = formMode == FormMode.forSet;

			jdlg.find(".notForFind").toggle(formMode != FormMode.forFind);

			// WUI.toggleFields也常用于控制jfrm上字段显示或jtbl上列显示
			var type = opt.objParam && opt.objParam.type;
			var isMgr = g_data.hasRole("mgr"); // 最高管理员
			var isAdm = g_data.hasRole("mgr,emp"); // 管理员
			WUI.toggleFields(jfrm, {
				type: !type,
				status: !type || type!="公告",
				atts: isAdm
			});

			// 根据权限控制字段是否可编辑。注意：find模式下一般不禁用。
			if (formMode != FormMode.forFind) {
				$(frm.empId).prop("disabled", !isMgr);
				$(frm.status).prop("disabled", forAdd || !isAdm);
				$(frm.code).prop("disabled", !isAdm);
			}
		}
		function onShow(ev, formMode, initData) {
			// 常用于add模式下设置初值，或是set模式下将原值转换并显示。
			// initData是列表页中一行对应的数据，框架自动根据此数据将对应属性填上值。
			// 如果界面上展示的字段无法与属性直接对应，可以在该事件回调中设置。
			// hiddenToCheckbox(jdlg.find("#divPerms"));
			if (forAdd) {
				$(frm.status).val("CR");
			}
			else if (forSet) {
				// 显示成表格
				jdlg.find("#tbl1").datagrid(...);
			}
		}
		function onValidate(ev, formMode, initData, newData) {
			// 在form提交时，所有带name属性且不带disabled属性的对象值会被发往服务端。
			// 此事件回调可以设置一些界面上无法与属性直接对应的内容。
			// 额外要提交的数据可放在隐藏的input组件中，或(v5.1)这里直接设置到newData对象中。
			// checkboxToHidden(jdlg.find("#divPerms"));
		}
		function onRetData(ev, data, formMode) {
			var formMode = jdlg.jdata().mode;
			if (formMode == FormMode.forAdd) {
				alert('返回ID: ' + data);
			}
		}
	}

在onBeforeShow中一般设置字段是否显示(show/hide/toggle)或只读(disabled)，以及在forAdd/forFind模式时为opt.data设置初始值(forSet模式下opt.data已填上业务数据)；
之后框架用opt.data数据填充相应字段，如需要补填或修改些字段（比如显示图片），可在onShow中处理，也可以直接在onBeforeShow中用setTimeout来指定，如：

	function onBeforeShow(ev, formMode, opt) {
		// ... 根据formMode等参数控制某些字段显示隐藏、启用禁用等...
		var frm = jdlg.find("form")[0];
		var isFind = formMode == FormMode.forFind;
		frm.type.disabled = !isFind;
		// 这里可以对opt.data赋值，但不要直接为组件设置值，因为接下来组件值会被opt.data中的值覆盖。

		setTimeout(onShow);
		function onShow() {
			// 这里可根据opt.data直接为input等组件设置值。便于使用onBeforeShow中的变量
		}
	}


@see checkboxToHidden (有示例)
@see hiddenToCheckbox 

@see imgToHidden
@see hiddenToImg (有示例)

### 列表页中的常见需求

框架中，对象列表通过easyui-datagrid来展现。
注意：由于历史原因，我们没有使用datagrid中的编辑功能。

参考：http://www.jeasyui.net/plugins/183.html
教程：http://www.jeasyui.net/tutorial/148.html

#### 列表页中的列，以特定格式展现

@key datagrid.formatter
@key datagrid.styler

示例一：显示名称及颜色

订单状态字段定义为：

	- status: 订单状态. Enum(CR-新创建,RE-已服务,CA-已取消). 

在显示时，要求显示其中文名称，且根据状态不同，显示不同的背景颜色。

在table中设置formatter与styler选项：

	<div class="pageOrder" title="订单管理" my-initfn="initPageOrder">
		<table id="tblOrder" style="width:auto;height:auto" title="订单列表">
			<thead><tr>
				<th data-options="field:'id', sortable:true, sorter:intSort">订单号</th>
				...
				<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter:Formatter.enum(OrderStatusMap), styler:Formatter.enumStyler({PA:'Warning', RE:'Disabled', CR:'#00ff00', null: 'Error'}), sortable:true">状态</th>
			</tr></thead>
		</table>
	</div>

formatter用于控制Cell中的HTML标签，styler用于控制Cell自己的CSS style, 常用于标记颜色.
在JS中定义：

	var OrderStatusMap = {
		CR: "未付款", 
		RE: "已服务", 
		CA: "已取消"
	};
	Formatter = $.extend(WUI.formatter, Formatter);

上面Formatter.enum及Formatter.enumStyler是框架预定义的常用项，也可自定义formatter或styler，例：

	var OrderColumns = {
		status: function (value, row) {
			if (! value)
				return;
			return OrderStatusMap[value] || value;
		},
		statusStyler: function (value, row) {
			var colors = {
				CR: "#000",
				RE: "#0f0",
				CA: "#ccc"
			};
			var color = colors[value];
			if (color)
				return "background-color: " + color;
		},
		...
	}

注意：

- WUI.formatter已经定义了常用的formatter. 通常定义一个全局Formatter继承WUI.formatter，用于各页面共享的字段设定.
- 习惯上，对同一个对象的字段的设定，都放到一个名为　{Obj}Columns 的变量中一起定义。

@see formatter 通用格式化函数

一些其它示例：

	var Formatter = {
		// 显示数值
		number: function (value, row) {
			return parseFloat(value);
		},
		// 订单编号，显示为一个链接，点击就打开订单对话框该订单。
		orderId: function (value, row) {
			if (value) {
				return WUI.makeLinkTo("#dlgOrder", row.orderId, value);
			}
		},
		// 显示状态的同时，设置另一个本地字段，这种字段一般以"_"结尾，表示不是服务器传来的字段，例如
		// <th data-options="field:'hint_'">提醒事项</th>
		status: function (value, row) {
			if (value) {
				if (value == "PA") {
					row.hint_ = "请于2小时内联系";
				}
				return StatusMap[value] || value;
			}
		}
	};

@see makeLinkTo 生成对象链接，以便点击时打开该对象的详情对话框。

#### 排序与分页

@key datagrid.sortable
@key datagrid.sorter

使用sortable:true指定该列可排序（可点击列头排序），用sorter指定排序算法（缺省是字符串排序），例如：

	<th data-options="field:'name', sortable:true">姓名</th>
	<th data-options="field:'id', sortable:true, sorter:intSort">编号</th>
	<th data-options="field:'score', sortable:true, sorter:numberSort">评分</th>

框架提供了intSort,numberSort这些函数用于整数排序或小数排序。也可以自定义函数。示例：

	function intSort(a, b)
	{
		return parseInt(a) - parseInt(b);
	}

注意：

- 指定sorter函数只会影响本地排序。而多数情况下，只要有多页，框架会使用远程排序。
 框架逻辑为：如果数据超过一页，使用远程排序, 否则使用本地排序减少请求。
- 本地排序(localSort)：点击列标题排序时，会重新发请求到服务端，并指定sort/排序字段,order/顺序或倒序参数
- 远程排序(remoteSort)：点排序时，直接本地计算重排，不会发请求到服务端.

@see intSort,numberSort

如果打开数据表就希望按某一列排序，可设置：

	jtbl.datagrid({
		...
		sortName: 'id',
		sortOrder: 'desc'
	});

手工点击列标题栏排序，会自动修改这两个属性。
在添加数据时，如果当前sortOrder是倒序，则新数据显示在表格当前页的最前面，否则显示在最后。

框架对datagrid还做了以下缺省设置：

- 默认开启datagrid的分页功能。每页缺省显示20条数据。可通过datagrid选项自行重新定义，如：

		jtbl.datagrid({
			...
			pageSize: 20,
			pageList: [20,30,50] // 在分页栏中可以选择分页大小
		});

- 当数据在一页内可显示完时，自动隐藏分页操作栏。

如果需要禁用分页，可以设置：

	jtbl.datagrid({
		url: WUI.makeUrl("Ordr.query", {"pagesz": -1}), // -1表示取后端允许的最大数量
		pagination: false, // 禁用分页组件
		...
	});

#### 列表导出Excel文件

(支持版本5.0)

除了默认地增删改查，还可为数据表添加标准的“导出Excel”操作，可自动按表格当前的显示字段、搜索条件、排序条件等，导出表格。
只需在dg_toolbar函数的参数中加上"export"（表示导出按钮），如：

	jtbl.datagrid({
		url: WUI.makeUrl("User.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export"),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	});

导出字段由jtbl对应的表格的表头定义，如下面表格定义：

	<table id="tblOrder" style="width:auto;height:auto" title="订单列表">
		...
		<th data-options="field:'id'">编号</th>
		<th data-options="field:'status'">状态</th>
		<th data-options="field:'hint_'">友情提示</th>
	</table>

它生成的res参数为"id 编号, status 状态"。"hint_"字段以下划线结尾，它会被当作是本地虚拟字段，不会被导出。

table上的title属性可用于控制列表导出时的默认文件名，如本例导出文件名为"订单列表.xls"。
如果想导出表中没有显示的列，可以设置该列为隐藏，如：

		<th data-options="field:'userId', hidden:true">用户编号</th>

@key jdEnumMap datagrid中th选项, 在导出文件时，枚举变量可显示描述

对于枚举字段，可在th的data-options用`formatter:WUI.formatter.enum(map)`来显示描述，在导出Excel时，需要设置`jdEnumMap:map`属性来显示描述，如

		<th data-options="field:'status', jdEnumMap: OrderStatusMap, formatter: WUI.formatter.enum(OrderStatusMap)">状态</th>

OrderStatusMap在代码中定义如下

	var OrderStatusMap = {
		CR: "未付款", 
		PA: "待服务"
	}

它生成的res参数为"id 编号, status 状态=CR:未付款;PA:待服务"。筋斗云后端支持这种res定义方式将枚举值显示为描述。

@see dg_toolbar 指定列表上的操作按钮
@see getExportHandler 自定义导出Excel功能
@see getQueryParamFromTable 根据当前datagrid状态取query接口参数

HINT: 点“导出”时会直接下载文件，看不到请求和调用过程，如果需要调试导出功能，可在控制台中设置  window.open=$.get 即可在chrome中查看请求响应过程。

#### datagrid增强项

easyui-datagrid已适配筋斗云协议调用，底层将发起callSvr调用请求（参考dgLoader）。
此外，增加支持`url_`属性，以便初始化时不发起调用，直到调用"load"/"reload"方法时才发起调用：

	jtbl.datagrid({
		url_: WUI.makeUrl("Item.query", {res:"id,name"}), // 如果用url则会立即用callSvr发起请求。
		...
	});
	// ...
	jtbl.datagrid("load", {cond: "itemId=" + itemId});
	jtbl.datagrid("reload");

如果接口返回格式不符合，则可以使用loadData方法：

	// 接口 Item.get() -> {item1=[{srcItemId, qty}]}
	callSvr("Item.get", {res:"item1"}, function (data) {
		jtbl.datagrid("loadData", data.item1); // 是一个对象数组
	});

datagrid默认加载数据要求格式为`{total, rows}`，框架已对返回数据格式进行了默认处理，兼容筋斗云协议格式（参考dgLoadFilter）。

	var rows = [ {id:1, name:"name1"}, {id:2, name:"name2"} ];
	jtbl.datagrid("loadData", {tota:2, rows: rows});
	// 还支持以下三种格式
	jtbl.datagrid("loadData", rows);
	jtbl.datagrid("loadData", {h: ["id","name"], d: [ [1, "name1"], [2, "name2"]}); // 筋斗云query接口默认返回格式。
	jtbl.datagrid("loadData", {list: rows}); // 筋斗云query接口指定fmt=list参数时，返回这种格式

#### treegrid集成

后端数据模型中有fatherId字段, 即可适配treegrid.

- 支持一次全部加载和分层次加载两种模式。
- 支持查询时，只展示部分行。
- 点添加时，如果当前有选中行，当这一行是展开的父结点（或是叶子结点，也相当于是展开的），则默认行为是为选中行添加子项，预置fatherId, level字段；
 如果是未展开的父结点，则是加同级的结点。
- 更新时如果修改了父结点, 它将移动到新的父结点下。否则直接刷新这行。
- 支持排序和导出。

在初始化页面时, 与datagrid类似: pageItemType.js

	var dgOpt = {
		// treegrid查询时不分页. 设置pagesz=-1. (注意后端默认返回1000条, 可设置放宽到10000条. 再多应考虑按层级展开)
		url: WUI.makeUrl("ItemType.query", {pagesz: -1}),
		toolbar: WUI.dg_toolbar(jtbl, jdlg),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	};
	// 用treegrid替代常规的datagrid
	jtbl.treegrid(dgOpt);

如果数据量非常大, 可以只显示第一层级, 展开时再查询.
仅需增加初始查询条件(只查第一级)以及一个判断是否终端结点的回调函数isLeaf (否则都当作终端结点将无法展开):

	var dgOpt = {
		queryParams: {cond: "fatherId is null"},
		isLeaf: function (row) {
			return row.level>1;
		},
		...
	};
	jtbl.treegrid(dgOpt);

### 详情页对话框的常见需求

#### 通用查询

在对话框中按快捷键"Ctrl-F"可进入查询模式。
详情页提供通用查询，如：

	手机号: <input name="phone">  
	注册时间: <input name="createTm">

可在手机号中输入"137*"，在注册时间中输入">=2017-1-1 and <2018-1-1" (或用 "2017-1-1~2018-1-1")，这样生成的查询参数为：

	{ cond: "phone like '137%' and (createTm>='2017-1-1' and createTm<'2018-1-1')" }

@see getQueryCond 查询条件支持
@see getQueryParam 生成查询条件

@key .wui-find-field 用于查找的字段样式
可设置该样式来标识哪些字段可以查找。一般设置为黄色。

@key .notForFind 指定非查询条件
不参与查询的字段，可以用notForFind类标识(为兼容，也支持属性notForFind)，如：

	登录密码: <input class="notForFind" type="password" name="pwd">
	或者: <input notForFind type="password" name="pwd">

@key .wui-notCond 指定独立查询条件

如果查询时不想将条件放在cond参数中，可以设置wui-notCond类标识，如：

	状态: <select name="status" class="my-combobox wui-notCond" data-options="jdEnumList:'0:可用;1:禁用'"></select>

如果不加wui-notCond类，生成的查询参数为：`{cond: "status=0"}`；加上后，生成查询参数如：`{status: 0}`.

(v5.3)

- 在对话框中三击（2秒内）字段标题栏，可快速按查询该字段。Ctrl+三击为追加过滤条件。
- 在页面工具栏中，按住Ctrl(batch模式)点击“刷新”按钮，可清空当前查询条件。

@key wui-find-hint 控制查询条件的生成。(v5.5) 

- 设置为"s"，表示是字符串，禁用数值区间或日期区间。
- 设置为"tm"或"dt"，表示是日期时间或日期，可匹配日期匹配。

示例：

	视频代码 <input name="code" wui-find-hint="s">

当输入'126231-191024'时不会当作查询126231到191024的区间。

#### 设计模式：关联选择框

示例：下拉框中显示员工列表 (Choose-from-list / 关联选择框)

@see jQuery.fn.mycombobox

#### picId字段显示图片

@see hiddenToImg (有示例)
@see imgToHidden

#### List字段显示为多个选项框

@see hiddenToCheckbox 
@see checkboxToHidden　(有示例)

### 设计模式：展示层次对象

例如设计有商品表Item, 每个商品属于特定的商户：

	@Item: id, storeId, name
	storeId:: Integer. 商品所属商户编号。

也就是说，商户包含商品。要展现商品，可将它放在商户层次之下。
可以这样设计用户操作：在商户列表上增加一个按钮“查看商品”，点击后打开一个新的列表页，显示该商户的商品列表。

定义两个列表页：

	<div class="pageStore" title="商户列表" my-initfn="initPageStore">
	</div>

	<div class="pageItem" title="商户商品" my-initfn="initPageItem">
	</div>

为这两个列表页定义初始化函数：

	// 商户列表页
	function initPageStore()
	{
		function showItemPage()
		{
			var row = jtbl.datagrid('getSelected');
			if(row == null){
				alert("您需要选择需要操作的行");
				return;
			}
			// !!! 调用showPage显示新页 !!!
			WUI.showPage("pageItem", "商户商品-" + row.name, [row.id]);
			// 要使每个商户都打开一个商品页面而不是共享一个页面，必须保证第二个参数（页面标题）根据商户不同而不一样。
			// 第三个参数是传给该页面初始化函数的参数列表，是一个数组。
		}
		var btn1 = {text: "查看商品", iconCls: "icon-search", handler: showItemPage};

		...
		jtbl.datagrid({
			...
			toolbar: WUI.dg_toolbar(jtbl, jdlg, btn1),
		});
	}

	// 商品列表页，注意有一个参数storeId, 并在查询时使用到它。
	function initPageItem(storeId)
	{
		jtbl.datagrid({
			// 用参数storeId过滤
			url: WUI.makeUrl("Item.query", {cond: "storeId=" + storeId}),
			...
		});
	}

注意：

调用WUI.showPage时，除了指定页面名，还指定了页面标题(第二参数)和页面初始化参数(第三参数, 一定是一个数组):

	WUI.showPage("pageItem", "商户商品-" + row.name, [row.id]);

显然，第二个参数随着商户名称不同而不同，这保证了不同商户打开的商品页面不会共用。
在商品页面初始化时，第三参数将传递给初始化函数：

	function initPageItem(storeId) // storeId=row.id

@see showPage
@key .wui-fixedField 固定值字段

此外，在Item页对应的详情对话框上（dlgItem.html页面中），还应设置storeId字段是只读的，在添加、设置和查询时不可被修改，在添加时还应自动填充值。
(v5.3) 只要在字段上添加wui-fixedField类即可：

	<select name="storeId" class="my-combobox wui-fixedField" data-options="ListOptions.Store()"></select>

注意：wui-fixedField在v5.3引入，之前方法是应先设置字段为readonly:

	<select name="storeId" class="my-combobox" data-options="ListOptions.Store()" readonly></select>

（select组件默认不支持readonly属性，框架定义了CSS：为select[readonly]设置`pointer-events:none`达到类似效果。）

然后，在initDlgItem函数中(dlgItem.js文件)，应设置在添加时自动填好该字段：

	function onBeforeShow(ev, formMode, opt)
		if (formMode == FormMode.forAdd && objParam.storeId) {
			opt.data.storeId = objParam.storeId;
		}

### 设计模式：页面间调用

仍以上节数据结构为例，上节是在每个商品行上点“查看商品”，就打开一个新的该商户下的商品列表页，
现在我们换一种操作方法，改成只用一个商品列表页（默认打开时显示所有商户的商品，可以手工查找过滤），在商户页中点“查看商品”，就自动打开商品列表页并做条件过滤。

先在主页面逻辑中为商品页定义一个接口：（比如在store.js中）

	var PageItem = {
		// param?: {storeId}
		show: function (param) {
			this.filterParam_ = param;
			WUI.showPage("pageItem");
		},
		filterParam_: null
	};

在商户页中，点击“查看商品”按钮时做过滤：

	function initPageStore()
	{
		function showItemPage()
		{
			var row = jtbl.datagrid('getSelected');
			...
			PageItem.show({storeId: row.id});
		}
		var btn1 = {text: "查看商品", iconCls: "icon-search", handler: showItemPage};

		...
		jtbl.datagrid({
			...
			toolbar: WUI.dg_toolbar(jtbl, jdlg, btn1),
		});
	}

在商品页中，处理PageItem.filterParam_参数，实现过滤，我们在pageshow回调中处理它，同时把初始化datagrid也移到pageshow中：

	function initPageItem()
	{
		var isInit = true;
		jpage.on("pageshow", pageShow);

		function pageShow() {
			// 接口变量PageItem.filterParam_用后即焚
			var param = null;
			if (PageItem.filterParam_) {
				param = WUI.getQueryParam(PageItem.filterParam_);
				PageItem.filterParam_ = null;
			}
			// 保证表格初始化只调用一次
			if (isInit) {
				jtbl.datagrid({
					url: WUI.makeUrl("Item.query"),
					queryParams: param,
					toolbar: WUI.dg_toolbar(jtbl, jdlg, "export"),
					onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
					sortName: "id",
					sortOrder: "desc"
				});
				isInit = false;
			}
			else if (param) {
				WUI.reload(jtbl, null, param);
			}
		}
	}

注意：

- 例子中通过页面接口，实现页面间的调用请求。
- 上面用了WUI.reload，在点击列表上的“刷新”时，只会按当前条件刷新，不会刷新出所有数据来，必须点“查找”，清除所有条件后查找，才可以看到所有数据；
 若想点“刷新”时显示所有数据，则可以将WUI.reload换成调用WUI.reloadTmp。

## 对话框功能

以群发短信功能为例。

假定服务端已有以下接口：

	sendSms(phone, content)
	phone:: 手机号
	content:: 发送内容

### 定义对话框

注意：每个带name属性的组件对应接口中的参数。

	<div id="dlgSendSms" title="群发短信" style="width:500px;height:300px;">  
		<form method="POST">
			手机号：<input name="phone" class="easyui-validatebox" data-options="required:true">
			发送内容： <textarea rows=5 cols=30 name="content" class="easyui-validatebox"  data-options="required:true"></textarea>
		</form>
	</div>

在form中带name属性的字段上，可以设置class="easyui-validatebox"对输入进行验证。

### 显示对话框

可以调用WUI.showDlg，写一个显示对话框的函数：

	function showDlgSendSms()
	{
		var jdlg = $("#dlgSendSms");
		WUI.showDlg(jdlg, {
			url: WUI.makeUrl("sendSms"),
			onOk: function (data) {
				WUI.closeDlg(jdlg);
				app_show('操作成功!');
			}
		});
	}

在showDlg的选项url中指定了接口为"sendSms"。操作成功后，显示一个消息。

(v5.5) 新的编程惯例，建议使用定义对话框接口的方式，写在主应用（如store.js）的接口区域，如：

	// 把showDlgSendSms换成DlgSendSms.show
	var DlgSendSms = {
		show: function () {
			// 同showDlgSendSms
		}
	};

@see showDlg
@see app_show

除了直接调用该函数显示对话框外，还有一种更简单的通过a标签href属性指定打开对话框的做法，如：

	<a href="?showDlgSendSms" class="easyui-linkbutton" icon="icon-ok">群发短信</a><br/><br/>

点击该按钮，即调用了showDlgSendSms函数打开对话框。

可以通过my-initfn属性为对话框指定初始化函数。复杂对话框的逻辑一般都写在初始化函数中。习惯上命令名initDlgXXX，如：

	<div id="dlgSendSms" title="群发短信" style="width:500px;height:300px;" my-initfn="initDlgSendSms">

	function initDlgSendSms() {
		var jdlg = $(this);
		// 处理对话框事件
		jdlg.on("beforeshow", onBeforeShow)
			.on("validate", onValidate);
		// 处理内部组件事件
		jdlg.find("#btn1").click(btn1_click);
		...
	}

### 页面传参数给对话框

(v5.1)
可以通过showObjDlg(jdlg, mode, opt)中的opt参数，或jdlg.objParam来给对话框传参。
在对话框的beforeshow事件处理中，可通过opt.objParam拿到参数，如：

	function initPageBizPartner() {
		var jdlg = $("#dlgSupplier");
		// 设置objParam参数供对话框使用。
		jdlg.objParam = {type: "C", obj: "Customer", title: "客户"}; // opt.title参数可直接设置对话框的标题。参考showObjDlg.
		jtbl.datagrid(toolbar: dg_toolbar(jtbl, jdlg, ...));
		// 点表格上的菜单或双击行时会调用 WUI.showObjDlg
	}

	function initDlgBizPartner() {
		// ...
		jdlg.on("beforeshow", onBeforeShow);
		
		function onBeforeShow(ev, formMode, opt) {
			// opt.objParam 中包含前面定义的type, obj, 以及id, mode等参数。
		}
	}

### 示例：页面与对话框复用 (v5.1)

设计有客户(Customer)和供应商(Supplier)两个虚拟的逻辑对象，它们物理底层都是业务伙伴对象(BizPartner)。
现在只设计一个页面pageBizPartner和一个对话框dlgBizPartner。

菜单中两项：
默认pageBizPartner是供应商，如果要显示为"客户"页，需要明确调用showPage。

	<a href="#pageBizPartner">供应商</a>
	<a href="javascript:WUI.showPage('pageBizPartner', '客户', ['C']);">客户</a>

在initPageBizPartner函数中，为对话框传递参数objParam：

	type = type || "S";
	var obj = "type=="S"? "Supplier": "Customer";
	jdlg.objParam = {type: type, obj: obj};
	// ...

在对话框的beforeshow事件处理中，根据opt.objParam.type确定标题栏:

	jdlg.on("beforeshow", function (ev, formMode, opt) {
		opt.title = opt.objParam.type == "C"? "客户": "供应商";
	});

### 只读对话框

(v5.1)
@key .wui-readonly 只读对话框类名

设置是否为只读对话框只要加上该类：

	jdlg.toggleClass("wui-readonly", isReadonly);

只读对话框不可输入(在style.css中设定pointer-events为none)，点击确定按钮后直接关闭。

### 只读字段：使用disabled和readonly属性

- disabled：不可添加或更新该字段，但可查询（即forAdd/forSet模式下只显示不提交，forFind时可设置和提交)，例如编号字段、计算字段。示例：

		<input name="id" disabled>
		<input name="userName" disabled>

- readonly：不可手工添加、更新和查询（但可通过代码设置）。示例：

		<input name="total" readonly>

(v5.3) 如果是在展示层次对象（参考[[设计模式：展示层次对象]]章节），某些字段是外部传入的固定值，这时用wui-fixedField类标识：

	<select name="storeId" class="my-combobox wui-fixedField" data-options="ListOptions.Store()"></select>

@see .wui-fixedField

## 模块化开发

@key wui-script
@key options.pageFolder

允许将逻辑页、对话框的html片段和js片段放在单独的文件中。以前面章节示例中订单对象的列表页（是一个逻辑页）与详情页（是一个对话框）为例：

- 页面名(即class)为pageOrder，UI与js逻辑分别保存在pageOrder.html, pageOrder.js中。
- 对话框id为dlgOrder, UI与js逻辑分别保存在dlgOrder.html, dlgOrder.js中。
- 模块所在目录默认为"page", 可通过在h5应用开头设置 WUI.options.pageFolder 来修改。

先在文件page/pageOrder.html中定义逻辑页

	<div title="订单管理" wui-script="pageOrder.js" my-initfn="initPageOrder">
		<table id="tblOrder" style="width:auto;height:auto">
			...
		</table>
	</div>

注意：

- 在html文件中用 wui-script属性 来指定对应的js文件。
- 无须像之前那样指定class="pageOrder" / id="dlgOrder" 这些属性，它们会根据页面文件名称由框架自动设置。

在html文件的div中可以添加style样式标签：

	<div>
		<style>
		table {
			background-color: #ddd;
		}
		</style>
		<table>...</table>
	</div>

注意：其中定义的样式（比如这里的table）只应用于当前页面或对话框，因为框架会在加载它时自动限定样式作用范围。

在文件page/pageOrder.js中定义逻辑：

	function initPageOrder() 
	{
		var jpage = $(this);
		...
	}

这时，就可以用 WUI.showPage("#pageOrder")来显示逻辑页了。

注意：逻辑页的title字段不能和其它页中title重复，否则这两页无法同时显示，因为显示tab页时是按照title来标识逻辑页的。

动态加载页面时，先加载逻辑页html和js文件，再将逻辑页插入应用程序并做系统初始化（如增强mui组件或easyui组件等），然后调用页面的用户初始化函数。
若希望在系统初始化之前做一些操作，应放在用户初始化函数之外。
例如，初始化过程中的服务调用使用批处理：

	functio initPageOrder() 
	{
		...
	}
	WUI.useBatchCall();

在文件page/dlgOrder.html中定义对话框UI:

	<div wui-script="dlgOrder.js" my-obj="Ordr" my-initfn="initDlgOrder" title="用户订单" style="width:520px;height:500px;">  
		<form method="POST">
			...
		</form>
	<div>

注意：

- 在html文件中用 wui-script属性 来指定对应的js文件。
- 无须像之前那样指定id="dlgOrder" 这些属性，它们会根据页面文件名称由框架自动设置。
- 和上面逻辑页定义一样，对话框专用的样式可以在主div标签内添加style标签来定义，在加载UI后样式作用域自动限定在当前对话框。

在文件page/dlgOrder.js中定义js逻辑:

	function initDlgOrder()
	{
		var jdlg = $(this);
		...
	}

这时，就可以用 WUI.showObjDlg("#dlgOrder")来显示逻辑页了。

#### 批量更新、批量删除

(v5.2) 
列表页支持两种批量操作模式。

- 基于多选行
	- 在数据表中按Ctrl多选；或按Shift连续选择。
	- 点击删除菜单，或在修改对话框点确定时，一旦发现是多选，则执行批量删除或批量更新。
- 基于过滤条件
	- 先搜索出要更新或删除的记录：
	- 批量更新：双击任意一行打开对话框，修改后按住Ctrl点击确定按钮，批量更新所有表中的内容。
	- 批量删除：按住Ctrl键点数据表上面的“删除”按钮，即是批量删除所有表中的内容。

服务端应支持`{obj}.setIf(cond)`及`{obj}.delIf(cond)`接口。

### 页面模板支持

定义一个逻辑页面，可以在#my-pages下直接定义，也可以在单独的文件中定义，还可以在一个模板中定义，如：

	<script type="text/html" id="tpl_pageOrder">
	<div class="pageOrder" title="订单管理" my-initfn="initPageOrder">
	...
	</div>
	</script>

模板用script标签定义，其id属性必须命名为`tpl_{逻辑页面名}`。
这样就定义了逻辑页pageOrder，且在用到时才加载。与从外部文件加载类似，可以不设置class="pageOrder"，框架会自动处理。

定义对话框也类似：

	<script type="text/html" id="tpl_dlgOrder">
	<div id="dlgOrder" my-obj="Ordr" my-initfn="initDlgOrder" title="用户订单" style="width:520px;height:500px;">  
	...
	</div>
	</script>

定义了对话框dlgOrder，这个id属性也可以不设置。
模板用script标签定义，其id属性必须命名为`tpl_{对话框名}`。

注意：

如果将script标签制作的页面模板内嵌在主页中，可能会造成加载时闪烁。
在chrome中，在easyui-layout之后定义任意script标签（哪怕是空内容），会导致加载首页时闪烁，标题栏是黑色尤其明显。
测试发现，将这些个script模板放在head标签中不会闪烁。

这个特性可用于未来WEB应用编译打包。

### 按需加载依赖库

@key wui-deferred
(v5.5)

如果页面或对话框依赖一个或一组库，且这些库不想在主页面中用script默认加载，这时可以使用`wui-deferred`属性。
页面或对话框初始化函数wui-initfn将在该deferred对象操作成功后执行。

示例：想在工艺对话框上使用mermaid库显示流程图，该库比较大，只在这一处使用，故不想在应用入口加载。
可在app.js中添加库的加载函数：

	var m_dfdMermaid;
	function loadMermaidLib()
	{
		if (m_dfdMermaid == null)
			m_dfdMermaid = WUI.loadScript("lib/mermaid.min.js");
		return m_dfdMermaid;
	}

在对话框html中用wui-deferred引入依赖库：

	<form my-obj="Flow" title="工艺" ... wui-deferred="loadMermaidLib()">

在对话框模块（初始化函数）中就可以直接使用这个库了：

	function initDlgFlow()
	{
		...
		mermaid.render("graph", def, function (svg) {
			jdlg.find(".graph").html(svg);
		});
	}

## 参考文档说明

以下参考文档介绍WUI模块提供的方法/函数(fn)、属性/变量(var)等，示例如下：

	@fn showPage(pageName, title?, paramArr?)  一个函数。参数说明中问号表示参数可缺省。
	@var options 一个属性。
	@class batchCall(opt?={useTrans?=0}) 一个JS类。
	@key example-dialog key表示一般关键字。前缀为"example-"用于示例讲解。
	@key .wui-page 一个CSS类名"wui-page"，关键字以"."开头。
	@key #wui-pages 一个DOM对象，id为"wui-pages"，关键字以"#"开头。

对于模块下的fn,var,class这些类别，如非特别说明，调用时应加WUI前缀，如

	WUI.showPage("#pageOrder");
	var opts = WUI.options;
	var batch = new WUI.batchCall();
	batch.commit();

以下函数可不加WUI前缀：

	intSort
	numberSort
	callSvr
	callSvrSync
	app_alert
	app_confirm
	app_show

参考wui-name.js模块。

*/

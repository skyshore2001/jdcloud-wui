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
		<div class="pageOrder" title="订单管理" my-initfn="initPageOrder">
			<table id="tblOrder" style="width:auto;height:auto">
				<thead><tr>
					<th data-options="field:'id', sortable:true, sorter:intSort">订单号</th>
					<th data-options="field:'userPhone', sortable:true">用户联系方式</th>
					<th data-options="field:'createTm', sortable:true">创建时间</th>
					<th data-options="field:'status', formatter:OrderColumns.statusStr, styler:OrderColumns.statusStyler, sortable:true">状态</th>
					<th data-options="field:'dscr', sortable:true">描述</th>
					<th data-options="field:'cmt'">用户备注</th>
				</tr></thead>
			</table>
		</div>
	</div>

注意：

- 逻辑页面div.pageOrder，属性class="pageOrder"定义了该逻辑页面的名字。它将作为页面模板，在WUI.showPage("pageOrder")时复制一份显示出来。
- 属性my-initfn定义了该页面的初始化函数. 在初次调用WUI.showPage时，会执行该初始化函数，用于初始化列表，设定事件处理等。
- 逻辑页面下包含了一个table，用于显示订单列表。里面每列对应订单的相关属性。

详情页展示为一个对话框，也将它也放在 div#my-pages 下。定义如下（此处为展示原理已简化）：

	<div id="dlgOrder" my-obj="Ordr" my-initfn="initDlgOrder" title="用户订单" style="width:520px;height:500px;">  
		<form method="POST">
			订单号：<input name="id" disabled></td>
			订单状态：
						<select name="status" style="width:150px">
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

注意：

- 对话框div#dlgOrder. 与列表页使用class标识名称不同，详情页对话框以id标识（因为全局共用一个对话框，而列表页可以复制为多个同时显示）。
- 对话框上定义了 "my-obj"属性，用于标识它对应的服务端对象名。对象增删改查操作都会用到它。
- 对话框的属性 my-initfn 定义了初始化函数，在首次显示时调用。
- 调用 WUI.showObjDlg($("#dlgOrder"), formMode) 可显示该对话框，一般由列表页自动调用。
- 对话框中包含一个form用于向服务端发起请求。form中每个带name属性的对象，都对应订单对象的一个属性，在添加、查找、显示或更新时都将用到，除非它上面加了disabled属性（这样就不会提交该字段）
- 对话框一般不用加“提交”按钮，框架会自动为它添加“确定”、“取消”按钮。

@see WUI.showObjDlg
@see WUI.showDlg

以上定义了订单对象的列表页和详情页，围绕对象"Order", 按规范，我们定义了以下名字：

- 列表页面（Tab页） div.pageOrder，列表 table#tblOrder，页面初始化函数 initPageOrder
- 详情页（对话框）div#dlgOrder，其中包含一个form。对话框初始化函数

### 添加入口按钮

	<a href="#pageOrder" class="easyui-linkbutton" icon="icon-ok">订单管理</a><br/><br/>

### 定义页面初始化函数

打开页面后，页面的生存周期如下：

@key pagecreate,pageshow,pagedestroy 页面事件
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
		// 显示待服务/正在服务订单
		var query2 = {cond: "status='CR' OR status='PA' OR status='ST'"};

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
			// 设置工具栏上的按钮，并与对话框jdlg关联。
			toolbar: WUI.dg_toolbar(jtbl, jdlg, "-", btn1, btn2),
			// 双击一行，应展示详情页对话框
			onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
		};
		jtbl.datagrid(dgOpt);
	}

@see WUI.showPage
@see WUI.dg_toolbar
@see WUI.dg_dblclick
@see WUI.makeUrl

### 定义对话框的初始化函数

@key example-dialog

默认对话框中由于设定了底层对象(my-obj)及属性关联（form中带name属性的组件，已关联对象属性），因而可自动显示和提交数据。

特别地，某些属性不宜直接展示，例如属性“人物头像”，服务器存储的是图片id(picId)，而展示时应显示为图片而不是一个数字；
或者如“权限列表”属性，服务器存储的是逗号分隔的一组权限比如"emp,mgr"，而展示时需要为每项显示一个勾选框。
这类需求就需要编码控制。

相关事件：
@see beforeshow,show 对话框中form显示前后
@see initdata,loaddata 对话框中form加载数据前后
@see savedata,retdata 对话框中form保存数据前后

对话框类名：
@see .wui-dialog

	function initDlgOrder()
	{
		var jdlg = $(this);
		var jfrm = jdlg.find("form");
		jfrm.on("beforeshow", function(ev, formMode) {
			jdlg.find(".forFind").toggle(formMode == FormMode.forFind);
			jdlg.find(".notForFind").toggle(formMode != FormMode.forFind);
		})
		.on("loaddata", function (ev, data, formMode) {
			// data是列表页中一行对应的数据，框架自动根据此数据将对应属性填上值。
			// 如果界面上展示的字段无法与属性直接对应，可以在该事件回调中设置。
			// hiddenToCheckbox(jfrm.find("#divPerms"));
		})
		.on("savedata", function (ev, formMode, initData) {
			// 在form提交时，所有带name属性且不带disabled属性的对象值会被发往服务端。
			// 此事件回调可以设置一些界面上无法与属性直接对应的内容。
			// checkboxToHidden(jfrm.find("#divPerms"));
		})
		.on("retdata", function (ev, data, formMode) {
			var formMode = jdlg.jdata().mode;
			if (formMode == FormMode.forAdd) {
				alert('返回ID: ' + data);
			}
		};
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

	status:: Enum. 订单状态。CR-新创建,RE-已服务,CA-已取消. 

在显示时，要求显示其中文名称，且根据状态不同，显示不同的背景颜色。

在table中设置formatter与styler选项：

	<div class="pageOrder" title="订单管理" my-initfn="initPageOrder">
		<table id="tblOrder" style="width:auto;height:auto">
			<thead><tr>
				<th data-options="field:'id', sortable:true, sorter:intSort">订单号</th>
				...
				<th data-options="field:'status', formatter:OrderColumns.statusStr, styler:OrderColumns.statusStyler, sortable:true">状态</th>
			</tr></thead>
		</table>
	</div>

formatter用于控制Cell中的HTML标签，styler用于控制Cell自己的CSS style.
在JS中定义函数：

	var OrderColumns = {
		statusStr: function (value, row) {
			var OrderStatusStr = {
				CR: "未付款", 
				RE: "已服务", 
				CA: "已取消"
			};
			return OrderStatusStr[value] || value;
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

- 习惯上，对同一个对象的字段的设定，都放到一个名为　{Obj}Columns 的变量中一起定义。
- 对于通用的或多处共享的字段设定，放到变量 Formatter 中.

示例二：下面是一些通用的例子，特别是生成对象链接经常会用到。

	var Formatter = {
		// 显示数值
		number: function (value)
		{
			return parseFloat(value);
		},
		// 显示一张或一组图片链接，点一个链接可以在新页面上显示原图片
		pics: function (value) {
			if (value == null)
				return "(无图)";
			return value.replace(/(\d+),?/g, function (ms, picId) {
				var url = WUI.makeUrl("att", {thumbId: picId});
				return "<a target='_black' href='" + url + "'>" + picId + "</a>&nbsp;";
			});
		},
		// 订单编号，显示为一个链接，点击就打开订单对话框该订单。
		orderId: function (value) {
			if (value != null)
			{
				return makeLinkTo("#dlgOrder", value, value);
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

### 详情页对话框的常见需求

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
		var btn1 = {text: "查看商品", iconCls: "icon-search", handler: showPageCloseOrder};

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

@see WUI.showPage

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
			手机号：<input name="phone" data-options="required:true">
			发送内容： <textarea rows=5 cols=30 name="content"></textarea>
		</form>
	</div>

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

@see WUI.showDlg
@see app_show

除了直接调用该函数显示对话框外，还有一种更简单的通过a标签href属性指定打开对话框的做法，如：

	<a href="?showDlgSendSms" class="easyui-linkbutton" icon="icon-ok">群发短信</a><br/><br/>

点击该按钮，即调用了showDlgSendSms函数打开对话框。

## 模块化开发

@key wui-script
@key WUI.options.pageFolder

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
*/

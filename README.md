# jdcloud-wui 筋斗云前端单页应用框架

jdcloud-wui是用于创建H5单页应用的技术框架，尤其适用于搭建各类管理平台，所以也称筋斗云管理端框架。
它以模型驱动开发思想为指导，以数据模型为核心，快速构建应用程序。
它倡导使用纯粹的单页应用框架加模块化开发，主H5页面只是空的框架，实际内容存在于每个逻辑页模块。
这些模块遵守**“页面对象模型”**，从而可以像搭积木一样构建起应用，尤其适用于大型业务系统。

它一般与筋斗云后端服务结合使用，可以使用以下开源框架实现筋斗云后端服务：

- jdclud-php (筋斗云后端php版本)
- jdclud-java (筋斗云后端java版本)
- jdclud-cs (筋斗云后端.net版本)

如果要创建手机H5应用程序，可以使用筋斗云移动端单页应用框架`jdcloud-mui`.

## 使用方法

lib目录包含框架的主程序 lib/jdcloud-wui.js (相应的压缩版本为lib/jdcloud-wui.min.js)以及它依赖的库jQuery 和 jQuery-easyui界面库。
将它们复制到你们项目中即可。

在example目录下是一个订单管理系统的示例，运行后，在登录框中可以任意输入用户名、密码进入，其中展现了对员工、用户、订单对象的管理。

对每个对象，一般有一个列表页加一个详情对话框，这称为**“列表页与详情页”的设计模式**。
在列表页上可以对数据进行分页列表、添加、更新、查询、点列标题按字段排序、删除等操作。
添加、更新和查询操作会打开一个弹出对话框。

在查询时支持多种复杂的条件组合，例如查询编号大于10，手机号中含有"3"的员工，可以：

- 点击查询按钮弹出查询对话框
- 在编号中输入">10"，在手机号中输入"*3*"，点击查找后在列表中展现结果。

下面以构建订单模块为例，讲解搭建jdcloud-wui应用程序的方法，带你大致了解框架编程风格。

- 为订单对象增加“列表页”（逻辑页）和“详情页”（对话框）。
- 点击列表中一项（一个订单），可显示详情页，即订单详情，并可进行查找、更新等功能。

对于更多常见需求的解决方案及函数用法，可以参考文档 jdcloud-wui.html。

## 框架页

在示例应用中，index.html为框架页，大致如下：

	引入jquery及jquery-easyui的库 ...
	引入jdcloud-wui库：<script src="../lib/jdcloud-wui.min.js"></script>
	引入h5应用自身逻辑，如 index.js

	引入模拟接口数据：在没有后端服务时，框架支持模拟接口数据。正式上线时应删除。
	<script src="mocktable.js"></script>
	<script src="mockdata.js"></script>

	主体部分使用jquery-easyui的界面布局。
	<body class="easyui-layout">
		<div id="menu" region="west" split="true" title="选择操作">
			这里是菜单列表
		</div>

		<div region="center" title="欢迎使用">
			<div id="my-tabMain" class="easyui-tabs" fit="true">
				这里是逻辑页展现区，注意id必须为"my-tabMain"，在程序中可通过WUI.tabMain来访问。
			</div>
		</div>

		<div id="my-pages" style="display:none">
			页面和对话框定义区，注意id必须为"my-pages"。
			<div class="pageHome" title="首页" my-initfn="initPageHome">
				class为页面名，一个页面可以有多个实例，例如显示“商户A的订单”与显示“商户B的订单”可以使用相同的订单页面，
				同时以两个标签页显示。
			</div>
			<div id="dlgLogin" title="超级管理员登录">  
				id为对话框名，因而一个对话框只有一个实例。
			</div>
		</div>
	</body>

在"my-pages"这个div中可以定义内置模块，不过一般不建议使用内置模块。

一般逻辑页和对话框都以外部模块的方式在外部page目录中定义，使用时以ajax方式动态加载。
如果不想在运行时动态加载外部模块，可在发布时通过打包工具将部分常用模块或全部模块打包进框架页，这样可兼顾开发和运行效率。

在page目录下，可以看到很多 pageXXX.html/js 和 dlgXXX.html/js 这便是逻辑页模块及对话框模块。

## 定义列表页

在文件page/pageOrder.html中定义逻辑页：

	<div title="订单管理" wui-script="pageOrder.js" my-initfn="initPageOrder">
		<table id="tblOrder" style="width:auto;height:auto">
			<thead><tr>
				<th data-options="field:'id', sortable:true, sorter:intSort">编号</th>
				<th data-options="field:'userId', sortable:true, formatter:Formatter.userId">用户编号</th>
				<th data-options="field:'status', sortable:true, formatter:OrderColumns.statusStr, styler:OrderColumns.statusStyler">状态</th>
				<th data-options="field:'dscr'">描述</th>
				<th data-options="field:'cmt'">用户备注</th>
			</tr></thead>
		</table>
	</div>

逻辑页面下包含了一个table，用于显示订单列表。里面每列对应订单的相关属性。

注意：

- 在html文件中用`wui-script`属性来指定对应的js文件，用`my-initfn`指定页面初始化函数，一般就定义在`wui-script`指定的js文件中。
- 无须像内置模块那样用`class="pageOrder"`指定页面名，框架在动态加载后会自动根据页面文件名称设置页面类名。

在html文件的div中（注意一定要写在页面的div内）可以添加style样式标签：

	<div>
		<style>
		table {
			background-color: #ddd;
		}
		</style>
		<table>...</table>
	</div>

在逻辑页模块中定义的样式（比如这里的table）只应用于当前逻辑页，框架会在加载它时自动限定样式作用范围。

在文件page/pageOrder.js中定义逻辑，即页面的初始化函数(initfn)。
初始化函数会在首次调用WUI.showPage时执行，且只会执行一次，一般用于初始化列表，设定事件处理等。

	function initPageOrder() 
	{
		var jpage = $(this);
		var jtbl = jpage.find("#tblOrder");
		var jdlg = $("#dlgOrder");

		jtbl.datagrid({
			url: WUI.makeUrl("Ordr.query"),
			toolbar: WUI.dg_toolbar(jtbl, jdlg),
			onDblClickRow: WUI.dg_dblclick(jtbl, jdlg),
			sortName:'id',
			sortOrder:'desc'
		});
	}

订单列表页的初始化，需要将列表页(代码中jpage)、列表(代码中jtbl)与详情页(代码中jdlg)关联起来，实现对话增删改查各项功能。

这时，就可以用`WUI.showPage("#pageOrder")`来显示逻辑页了。

一般，我们在主框架的菜单列表区域中添加一个链接，点击链接即可打开该逻辑页：

	<a href="#pageOrder" class="easyui-linkbutton" icon="icon-ok">订单管理</a>

在修改逻辑页后，一般不必刷新整个H5应用，可以在控制台上直接运行：

	WUI.reloadPage();

就可以直接查看到更新后的逻辑页了。这称为**逻辑页热更新技术**，这一技巧在开发调试逻辑页时非常好用。
注意：热更新技术不能用于内部模块。

## 定义详情页

详情页展示为一个对话框。
在文件page/dlgOrder.html中定义对话框UI（此处为展示原理已简化）：

	<div my-obj="Ordr" title="用户订单">
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

对话框"my-obj"属性用于标识它对应的服务端对象（即数据模型）名。
对象增删改查操作都会用到它，默认地，它会调用后端的"Ordr.add", "Ordr.query", "Ordr.set", "Ordr.del"接口，这些称为筋斗云通用对象接口。
关于对象通用接口的通讯协议（称为业务查询协议-BQP）及接口原型，可参考后面章节“后端接口服务”。

对话框中包含一个form用于向服务端发起请求。form中每个带name属性的对象，都对应订单对象的一个属性，在添加、查找、显示或更新时都将用到，除非它上面加了disabled属性（这样就不会提交该字段）。

对话框中不用定义“提交”按钮，框架会自动为它添加“确定”、“取消”按钮。

最后，调用`WUI.showObjDlg`就可以指定模式显示该对话框，一般这个动作由列表页自动调用，无须写代码。

	WUI.showObjDlg("#dlgOrder", FormMode.forAdd); // 添加模式打开对话框，点列表页上的“添加”按钮可自动做此操作
	// 查找、更新模式类似。

对象对话框还有一种链接模式，用于点击一个链接即打开某对象，如：

	WUI.showObjDlg("#dlgOrder", FormMode.forLink, 1001); // 链接模式打开对话框，显示1001号订单
	
一般使用WUI.makeLinkTo函数自动生成链接。详细可参考文档。

以上定义了订单对象的列表页和详情页，围绕对象"Order", 按惯例我们定义了以下名字：

- 列表页面（Tab页）名为pageOrder，其中的列表(table)名为tblOrder，页面初始化函数名为 initPageOrder
- 详情页（对话框）名为dlgOrder，其中包含一个form。对话框初始化函数为 initDlgOrder (如果有的话)

本例中对话框没有特别的逻辑，因此没有对应js文件。
如果需要添加逻辑，也可以与列表页类似，通过`wui-script`属性和`my-initfn`属性分别指定了对话框的外部js脚本以及对话框初始化函数名。

对话框初始化函数示例如下：

	function initDlgOrder()
	{
		var jdlg = $(this);
		var jfrm = jdlg.find("form");
		jfrm.on("beforeshow", function(ev, formMode) {
			// 根据formMode做页面初始化，如隐藏某些组件
		})
		.on("loaddata", function (ev, data, formMode) {
			// data是列表页中一行对应的数据，框架自动根据此数据将对应属性填上值。
			// 如果界面上展示的字段无法与属性直接对应，可以在该事件回调中设置。
		})
		.on("savedata", function (ev, formMode, initData) {
			// 在form提交时，所有带name属性且不带disabled属性的对象值会被发往服务端。
			// 此事件回调可以设置一些界面上无法与属性直接对应的内容。
		})
		.on("retdata", function (ev, data, formMode) {
			// 处理返回数据data
		});
	}

通过form对象监听不同的事件来处理。

在对话框模块修改后，也支持模块热更新，不必刷新整个网页，而是直接在控制台运行：

	WUI.reloadDialog();

这样会关闭当前激活状态下的对话框，当再次打开对话框时，在模块html或js文件中的更改就会生效。

## 对话框

前面介绍了作为对象详情页的对话框(obj dialog，通过WUI.showObjDlg显示)，可以与一个数据模型绑定后迅速实现增删改查操作。

也可以定义一般的对话框，比如登录等非关联对象的功能。
下面以群发短信功能为例。

假定服务端已有以下接口：

	sendSms(phone, content)
	phone:: 手机号
	content:: 发送内容

先定义对话框UI，在page/dlgSendSms.html中定义：

	<div title="群发短信" style="width:500px;height:300px;">  
		<form method="POST">
			手机号：<input name="phone" data-options="required:true">
			发送内容： <textarea rows=5 cols=30 name="content"></textarea>
		</form>
	</div>

注意：每个带name属性的组件对应接口中的参数。

可以在index.js中定义一个函数，调用WUI.showDlg显示该对话框：

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

除了直接调用该函数显示对话框外，还可通过a标签href属性打开对话框，如：

	<a href="?showDlgSendSms" class="easyui-linkbutton" icon="icon-ok">群发短信</a><br/><br/>

点击该按钮，即调用了showDlgSendSms函数打开对话框。

TODO: 参考MUI，可在dialog中自行定义逻辑。

## 后端接口服务

jdcloud-wui的自动对象操作，以订单增删改查为例，需要后端提供如下接口：

	Ordr.add()(要添加的字段值) -> id
	Ordr.set(id)(要更新的字段值)
	Ordr.get(id) -> { id, ... }
	Ordr.del(id)
	Ordr.query(cond?, _pagesz, _pagekey, _fmt) -> { total?, h=[列名1, 列名2, ...], d=[ [行1数据], [行2数据] ] }

上面是用接口原型语言来描述的，通过HTTP协议来实现。
以Ordr.add接口为例，两个括号表示前一个括号中的参数要用URL参数，后一个括号中的参数表示要用POST参数。

如果描述中只有一个括号，则表示用URL或POST参数都可以。

返回数据使用JSON格式，成功时返回`[0, retData]`数组，其中retData的详细格式在接口原型中定义，如Ordr.add的返回数据就直接是新生成的订单id.
如果失败，则返回`[非0错误码, 错误信息, 可选的调试信息]`数组格式，框架会自动弹出错误信息。

接口地址由`WUI.options.serverUrlAc`指定，如

	WUI.options.serverUrl = "http://localhost/jdcloud-php/api.php";

调用示例：

	POST /jdcloud-php/api.php/Ordr.add

	dscr=基础套餐&userId=1

返回示例：	

	HTTP/1.1 200 OK

	[0, 1001]

返回错误示例：

	HTTP/1.1 200 OK

	[5, "禁止操作"]

通用查询操作可以通过cond参数指定查询，其格式类似SQL的WHERE语句，如cond="id>10 and phone like '%3%'"，这也是实现前端灵活查询的基础。
查询操作支持分页。关于筋斗云通用接口的详细定义，请查询筋斗云后端接口文档。

除了对象操作可自动调用接口外，还可以通过callSvr函数手工调用任意后端接口，原型为：

	callSvr(接口名, URL参数?可缺省, 回调函数, POST参数?可缺省)

示例：

	callSvr("Ordr.add", api_OrdrAdd, {dscr: "基础套餐", userId:1});
	function api_OrdrAdd(data) {
		var id = data;
	}

	callSvr("Ordr.query", {cond: "id>10 and phone like '%3%'"}, api_OrdrQuery);
	function api_OrdrQuery(data) {
		// 查询接口返回压缩表格式，示例 data={h: ["id","dscr"], d: [ [1, "订单1"], [2, "订单2"] ], total: 80 }
		var arr = WUI.rs2Array(data);
		// 通过rs2Array函数转成常用的对象数据格式  arr= [ {id: 1, dscr: "订单1"}, {id: 2, dscr: "订单2"} ]
	}

## 模拟接口数据

由于没有后端接口服务，示例程序是通过模拟接口数据来运行的。

在开发时，当后端尚未开发完成时，也可以用模拟数据来测试应用，只要定义WUI.mockData即可。
示例程序中的mockdata.js就是定义模拟接口数据，如

	WUI.options.mockDelay = 200; // 模拟调用时间，毫秒
	WUI.mockData = {
		"login": [0, empTable.get(1)],
		"logout": [0, "OK"],
		"execSql": [1, "未实现"]
	};
	userTable.regSvc(WUI.mockData); // 注册"用户"对象服务，提供 "User.query/add/set/del/get"这些接口。
	
文件mocktable.js提供了一个简单的对象增删改查模拟服务的框架。


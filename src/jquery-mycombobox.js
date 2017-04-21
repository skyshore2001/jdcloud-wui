// ====== jquery plugin: mycombobox {{{
/**
@fn jQuery.fn.mycombobox(force?=false)

@key .my-combobox 关联选择框
@var ListOptions 定义关联选择框的数据源

@param force?=false 如果为true, 则调用时强制重新初始化。默认只初始化一次。

关联选择框组件。

用法：先定义select组件：

	<select name="empId" class="my-combobox" data-options="valueField: 'id', ..."></select>

通过data-options可设置选项: { valueField, textField, url, formatter(row), loadFilter(data) }

初始化：

	$(".my-combobox").mycombobox();

注意：使用WUI.showDlg显示的对话框中如果有.my-combobox组件，会在调用WUI.showDlg时自动初始化，无须再调用上述代码。

特性：

- 初始化时调用url指定接口取数据并生成下拉选项。
- 双击可刷新列表。
- 支持数据缓存，不必每次打开都刷新。

例如，在订单上设计有empId字段：

	@Ordr: id, ... empId

	empId:: Integer. 员工编号，关联Employee.id字段。

在显示订单详情对话框时，这列显示为“分派给员工”，是一个列出所有员工的下拉列表框，可以这样写：

	<tr>
		<td>分派给</td>
		<td><select name="empId" class="my-combobox" data-options="valueField:'id',textField:'name',url:WUI.makeUrl('Employee.query', {wantArray:1})"></select></td>  
	</tr>

为了精确控制返回字段与显示格式，data-options可能更加复杂，一般建议写一个返回这些属性的函数，像这样：

		<td><select name="empId" class="my-combobox" data-options="ListOptions.Emp()"></select></td>  

习惯上，可以把函数统一放在ListOptions变量中：

	var ListOptions = {
		// ListOptions.Emp()
		Emp: function () {
			var opts = {
				valueField: "id",
				textField: "name",
				url: WUI.makeUrl('Employee.query', {
					res: 'id,name,uname',
					cond: 'storeId=' + g_data.userInfo.storeId,
					wantArray:1
				}),
				formatter: function (row) { return row.name + '(' + row.uname + ')'; }
			};
			return opts;
		},
		...
	};

另一个例子：在返回列表后，可通过loadFilter修改列表，例如添加一项：

	<select name="brandId" class="my-combobox" data-options="ListOptions.Brand()" ></select>

JS代码ListOptions.Brand:

	var ListOptions = {
		...
		// ListOptions.Brand()
		Brand: function () {
			var opts = {
				valueField: 'id',
				textField:'name',
				url:WUI.makeUrl('queryBrand', {wantArray:1}),
				loadFilter: function(data) {
					data.unshift({id:'0', name:'所有品牌'});
					return data;
				}
			};
			return opts;
		}
	};

 */
var m_dataCache = {}; // url => data
$.fn.mycombobox = function (force) 
{
	this.each(initCombobox);

	function initCombobox(i, o)
	{
		var jo = $(o);
		if (!force && jo.prop("inited_"))
			return;
		jo.prop("inited_", true);

		var opts = {};
		var optStr = jo.data("options");
		try {
			if (optStr != null)
			{
				if (optStr.indexOf(":") > 0) {
					opts = eval("({" + optStr + "})");
				}
				else {
					opts = eval("(" + optStr + ")");
				}
			}
		}catch (e) {
			alert("bad options for mycombobox: " + optStr);
		}
		if (opts.url) {
			loadOptions();

			function loadOptions()
			{
				jo.empty();
				// 如果设置了name属性, 一般关联字段(故可以为空), 添加空值到首行
				if (jo.attr("name"))
					$("<option value=''></option>").appendTo(jo);

				if (m_dataCache[opts.url] === undefined) {
					self.callSvrSync(opts.url, applyData);
				}
				else {
					applyData(m_dataCache[opts.url]);
				}

				function applyData(data) 
				{
					m_dataCache[opts.url] = data;
					function getText(row)
					{
						if (opts.formatter) {
							return opts.formatter(row);
						}
						else if (opts.textField) {
							return row[opts.textField];
						}
						return row.id;
					}
					if (opts.loadFilter) {
						data = opts.loadFilter.call(this, data);
					}
					$.each(data, function (i, row) {
						var jopt = $("<option></option>")
							.attr("value", row[opts.valueField])
							.text(getText(row))
							.appendTo(jo);
					});
				}
			}

			if (!jo.attr("ondblclick"))
			{
				jo.off("dblclick").dblclick(function () {
					if (! confirm("刷新数据?"))
						return false;
					var val = jo.val();
					loadOptions();
					jo.val(val);
				});
			}
		}
	}
};
//}}}


## 版本管理

版本在Makefile中定义，如

	VER=1.0

在最终js文件的首行会有版本标识。

发布大版本时，版本库应创建一个分支，如ver1, ver2等。
发布小版本时，版本库应创建一个tag，如ver1.0，ver1.1等。

## 测试与文件合并

示例程序 ../example/index.html 中默认引用每个源文件：

	<!-- WEBCC_BEGIN MERGE=jdcloud-wui -->
	<script src="../src/common.js"></script>
	...
	<!-- WEBCC_END -->

运行make会据此合并生成发布文件 jdcloud-wui.js 及 jdcloud-wui.min.js

## 构建与生成文档

运行`make -B`(-B为强制生成)可生成合并后的库文件(jdcloud-wui.js)、参考文档(jdcloud-wui.html)以及最小化后的库文件(jdcloud-wui.min.js)

如果是外部更新了jdcloud-wui.js这个库文件，可以运行`make split`将jdcloud-wui.js拆分还原到src目录中的源文件中。

运行`make doc`生成文档。

## 模块惯例

使用模块可以让名字不占用全局空间，避免出现名字冲突。
在wui-name.js中定义了全局名字WUI，如果有冲突直接改这个文件内容即可。

定义一个模块：

	jdModule("jdcloud.common", ns_jdcloud_common);
	function ns_jdcloud_common()
	{
	var self = this;

	/**
	@fn fn1()
	公共函数fn1
	*/
	self.fn1 = fn1;
	function fn1() {}
	}

扩展一个模块：

	// 模块jdcloud.common已定义过，再定义则表示扩展
	jdModule("jdcloud.common", ns_jdcloud_commonjq);
	function ns_jdcloud_commonjq()
	{
	var self = this;

	...
	}

定义子模块：(不使用jdModule)

	function ns_jdcloud_wui_sub1()
	{
	var self = this;
	self.ctx = self.ctx || {};

	// 不暴露，但在模块内部共享
	self.ctx.fn2 = fn2;
	function fn2() {}
	}

主模块中使用子模块：

	jdModule("jdcloud.wui", ns_jdcloud_wui);
	functin ns_jdcloud_wui()
	{
	var self = this;
	var mCommon = jdModule("jdcloud.common");
	self.ctx = self.ctx || {};

	// 加载子模块
	ns_jdcloud_wui_sub1.call(self);

	function fn3()
	{
		mCommon.fn1();
		self.ctx.fn2();
	}

	}

## 轻量版本(slim版)

生成用于集成的版本。

	make slim
	或
	make -f Makefile.slim

生成lib/jdcloud-wui-slim.js


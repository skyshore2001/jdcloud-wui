// doc: https://jasmine.github.io/2.5/introduction

jasmine.DEFAULT_TIMEOUT_INTERVAL = 200;
// TODO: handle my-tabMain and my-pages

describe("callsvr", function() {
	// 模拟$.ajax, 将回调success(data)
	// onCheckAjaxOpt?(opts={url,type,data,dataType,...})
	function setSpyAjax(serverReturnData, onCheckAjaxOpt) {
		spyOn($, "ajax").and.callFake(function(url, opts) {
			if ($.isPlainObject(url)) {
				opts = url;
				url = opts.url;
			}
			else {
				opts = opts || {};
				opts.url = url;
			}
			if (opts.type == null)
				opts.type = "GET";
			if (opts.dataType == null)
				opts.dataType = "text";

			if (onCheckAjaxOpt) {
				onCheckAjaxOpt(opts);
			}

			var dfd = $.Deferred();
			if (opts.async === false) {
				done();
			}
			else {
				setTimeout(done);
			}
			function done() {
				var data = JSON.stringify(serverReturnData);
				var filter = opts.dataFilter || $.ajaxSettings.dataFilter;
				var data1 = filter.call(opts, data, opts.dataType);
				if (opts.success)
					opts.success.call(opts, data1);
				dfd.resolve(data1);
			}
			return dfd;
		});
	}

	it("callSvr-正常返回时回调", function (done) {
		// BQP协议: [retcode, retval]
		setSpyAjax([0, "OK"]);
		var dfd = callSvr("fn", success);
		expect($.ajax).toHaveBeenCalled();
		dfd.then(success2);
		// 先回调,再调用dfd.then的函数.

		function success(data) {
			expect(data).toEqual("OK");
		}
		function success2(data) {
			expect(data).toEqual("OK");
			done();
		}
	});
	it("callSvr-正确处理参数", function (done) {
		setSpyAjax([0, "OK"], onCheckAjaxOpt);
		var params = {a:1, b:'c'};
		var postParams = {c:1, d:'e'};
		var ret = callSvr("fn", params, success, postParams);
		expect($.ajax).toHaveBeenCalled();

		function success(data) {
			expect(data).toEqual("OK");
			done();
		}

		function onCheckAjaxOpt(opts) {
			expect(opts.type).toEqual("POST");
			expect(opts.url.indexOf($.param(params)) > 0).toEqual(true);
			expect(opts.data).toEqual(postParams);
		}
	});
	it("callSvr-返回错误时由框架接管", function (done) {
		var retData = [1, "bad param"];

		// 系统报错调用WUI.app_alert后再调用app_abort
		spyOn(WUI, "app_alert").and.callFake(function () {
			expect(WUI.lastError.ret).toEqual(retData);
			done();
		});
		//spyOn(WUI, "app_abort");

		setSpyAjax(retData);
		var ret = callSvr("fn", success);
		expect($.ajax).toHaveBeenCalled();

		// 不会调用该函数
		function success(data) {
			fail();
		}
	});
	it("callSvr-自行处理错误noex:1", function (done) {
		var retData = [1, "bad param"];
		setSpyAjax(retData);
		var ret = callSvr("fn", success, null, {noex:1});
		expect($.ajax).toHaveBeenCalled();

		function success(data) {
			expect(data).toEqual(false);
			expect(this.lastError).toEqual(retData);
			expect(WUI.lastError.ret).toEqual(retData);
			done();
		}
	});
	it("callSvrSync-同步调用", function () {
		// BQP协议: [retcode, retval]
		setSpyAjax([0, "OK"]);

		var called = false;
		var ret = callSvrSync("fn", success);
		expect($.ajax).toHaveBeenCalled();
		expect(ret).toEqual("OK");
		expect(called).toEqual(true);

		function success(data) {
			expect(data).toEqual("OK");
			called = true;
		}
	});
});


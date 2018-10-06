
RETCODE = {
	OK: 0,
	FAIL: 500
};

function api_request(api_name, data , succ_cb, fail_cb) {

    var req = { api : api_name, data : data };
    $.ajax({
        type: "POST",
        url: "/adminapi",
        data: JSON.stringify(req),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(ret) {
            if (ret.errcode !== 0) {
                alert("请求失败=" + ret.errcode)
                if ( fail_cb ) fail_cb();
            } else {
                succ_cb(ret);
            }
        },
        failure: function(errMsg) {
            alert("请求失败=" + errMsg);
            if ( fail_cb ) fail_cb();
        }
    });
}


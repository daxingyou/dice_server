function jPost(u, d, cb) {
    $.ajax({
        type: "POST",
        url: u,
        data: JSON.stringify(d),
        dataType: "json",
        contentType : 'application/json',
        success: function (data) { if (cb) cb(data); }
    });
}
function doLogin() {
    var user  = $.trim($('.peak-user').val());
    var pwd   = $.trim($('.peak-pwd').val());
    var nioce = Date.now();
    var sign  = md5(md5(pwd)+nioce);
    jPost('/peak/board/login', {username:user, nioce:nioce, sign:sign}, function(res) {
        if (res.code != 0) {
            alert(res.msg);
            return ;
        }
        window.location = 'board.html';
    });
}
$('.peak-subtn').click(doLogin);

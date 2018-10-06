


function room_init()
{
    list_game_config(ret=>{

        jsGrid.locale("zh-cn");

        var cost_of_room = [];
        ret.data.forEach(function(r){
            if ( r.type == "cost_of_room")
                cost_of_room.push(r);
        });

        var types = [
            { val: 'shmj', name: '上海敲麻' },
            { val: 'gzmj', name: '酒都麻将' }
        ];

        $("#cost_table").jsGrid({
            width: "100%",
            height: "200px",

            //inserting: true,
            editing: true,
            sorting: true,
            paging: true,

            data: cost_of_room,

            fields: [
                { title : "游戏", name: "game", type: "select", items: types, valueField: "val", textField: "name", editing: false },
                { title : "描述" ,name: "desc", type: "text", width: 150, editing : false },
                { title : "局数" ,name: "round", type: "number", width: 50, editing: false },
                { title : "消耗钻石" ,name: "need_gem", type: "number", width: 200, validate: "required" },
                {
                    type: "control",
                    deleteButton : false
                }
            ],

            onItemUpdated: function (grid) {
                console.log(grid);
                var item = grid.item;
                if ( item.type != "cost_of_room")
                    return;
                update_game_config(item,function(ret){
                    if ( ret.errcode == 0 )
                        alert("更新成功");
                    else
                        alert("更新失败");

                });

            }
        });

        var fan_config = [];
        ret.data.forEach(function(r){
            if ( r.type == "fan")
                fan_config.push(r);
        });

        $("#px_table").jsGrid({
            width: "100%",
            height: "800px",

            inserting: true,
            editing: true,
            sorting: true,
            paging: true,

            data: fan_config,

            fields: [
                { title : "牌型" ,name: "desc", type: "text", width: 100, editing: true, validate: "required" },
                { title : "匹配码" ,name: "code", type: "text", width: 100, editing: true, validate: "required" },
                { title : "积分" ,name: "fan_score", type: "number", width: 200, validate: "required" },
                { title : "金币" ,name: "fan_gold", type: "number", width: 200, validate: "required" },
                {
                    type: "control",
                    deleteButton : true,
                    itemTemplate: function(value, item) {
                        var $result = $([]);
                        $result = $result.add(this._createEditButton(item));
                        return $result;
                    }
                }
            ],
            onItemUpdated: function (grid) {
                console.log(grid);
                var item = grid.item;
                if ( item.type != "fan")
                    return;
                update_game_config(item,function(ret){
                    if ( ret.errcode == 0 )
                        alert("更新成功");
                    else
                        alert("更新失败");

                });

            },

            onItemInserted : function(grid){
		console.log('onItemInserted');
                var item = grid.item;
                add_game_config(item, function(ret){
                    if ( ret.errcode == 0 )
                        alert("添加成功");
                    else
                        alert("添加失败");
                });
            },
        });

    });
}

function update_game_config(item,callback){
    api_request("user.update_game_config", item, callback);
}

function list_game_config(callback){
    api_request("user.list_game_config", {}, callback);
}

function add_game_config(item, callback){
    console.log('add');
    api_request("user.add_game_config", item, callback);
}



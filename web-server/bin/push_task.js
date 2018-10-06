#!/usr/bin/env node

var db = require("../shared/sql_models");
var userDao = require("../shared/sql_dao/userDao");
var dateformat = require("dateformat");


function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function push_daily(uid,date)
{
    var tasks = [];
    for (var name in db["usertask"].TASK)
    {
        var task = db["usertask"].TASK[name];
        //only push daily task
        if ( !task.daily )
            continue ;


        if ( task.daily === true)
            tasks.push({
                task_type : name ,
                is_daily : task.daily,
                task_date : date,
                count: 0,
                max_count : task.count,
                user_id : uid,
                reward: task.reward
            });
    }

    //only push 3 tasks
    var new_tasks = shuffle(tasks).slice(0,3);
    db['usertask'].bulkCreate(new_tasks);

}

db["user"].findAll()
.then(users=>{
    users.forEach(function(user){
        push_daily(user.id, dateformat(new Date(),"yyyy-mm-dd"));
    })
});

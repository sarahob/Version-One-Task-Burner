/*Wrap in self invoking function to hide globals*/
(function() { 
  
    //namespace
    var ns = {

    //user detail object to manage user login
    userDetails : {},
    // status map to get task statuseses (stati?)
    statusMap : {},
    //alarm object for notification
    alarmInfo : {},
    
     /*
      Attach initial click handlers to buttons
    */
    attachInitialHandlers: function(){

      //add click handler to settings button
       $('#settings').click(function(){
            //set existing values
            if(ns.userDetails.uname && ns.userDetails.baseUrl){
              $('#uname').val(ns.userDetails.uname);
              $('#baseUrl').val(ns.userDetails.baseUrl);
            }
            ns.showSettings();
          });

      $('#changeUserDetails').click(function() {
              ns.setUserDetails();
          });
    },

    setUpStatuseses: function(){
      $.ajax({
            url: ns.userDetails.baseUrl + 'rest-1.v1/Data/TaskStatus?&accept=text/json',
            type: 'GET',
            dataType: 'json',
            success: ns.assignStatuses,
            error: ns.errorPath,
            beforeSend: ns.setHeader
          });
    },

    assignStatuses: function(res){
     //Copyright: PerterB - https://github.com/PerterB/VersionOneBacklogProvider
          for (var i = 0; i < res.Assets.length; i++) {
              ns.statusMap[res.Assets[i].Attributes.Name.value] = res.Assets[i].id;
          } 
    },

    /* Switch Views */
    showSettingsView: function(){
      $('.main').hide();
      $('.settings').show();
    },

    showTasksView: function() {
      $('.main').show();
      $('.settings').hide();
    },

      /*
          Check local storage, if username and password are not found open the details view first, otherwise load tasks
      */
    checkIfUserExists: function(){

          chrome.storage.local.get(['username', 'baseUrl'], function (items){
              if(items.username && items.baseUrl){
                ns.userDetails.uname = items.username;
                ns.userDetails.baseUrl = items.baseUrl;

                ns.validateUser(ns.userDetails.uname, ns.userDetails.baseUrl, false, function(validUser){
                  if(validUser){
                    ns.requestTasks();
                    ns.setUpStatuseses();
                  } else{
                    ns.showSettingsView();
                    ns.slider('Invalid Login: Please make sure you are logged into Version One in your browser session.', false);
                  }
                });
              }else{
                 ns.showSettingsView();
              }
        });
    },
   
    requestTasks: function() {

       $('.main').html('');
       $('.loading').show();

          $.ajax({
            url: ns.buildUrl(ns.userDetails.uname),
            type: 'GET',
            dataType: 'json',
            success: ns.showItems,
            error: ns.errorPath,
            beforeSend: ns.setHeader
          });
    },
      
    buildUrl: function(uname){
      return ns.userDetails.baseUrl + 'rest-1.v1/Data/Task?where=Owners.Username=%27'+ uname +'%27;Status.Name=%27In%20Progress%27&sel=Parent,ToDo,DetailEstimate,Name,Actuals.Date,Actuals.Value,Actuals.Member,Status&accept=text/json';
    },

    errorPath: function(){
        ns.slider('Error: Something has gone horribly wrong. Please try again.', false);
    },

    postToDoHours: function(taskObj){
      $.ajax({
        url: ns.userDetails.baseUrl + 'rest-1.v1/Data/Task/'+ taskObj.taskId.split(':')[1] +'?accept=text/json',
        type: 'POST',
        data: '<Asset><Attribute name="ToDo" act="set">' + taskObj.toDo + '</Attribute><Attribute name="Status" act="set">'+ taskObj.taskStatus +'</Attribute></Asset>', //<Attribute name="Status" act="set">TaskStatus:125</Attribute>
        success: ns.postEffortHours(taskObj),
        error: ns.errorPath,
        beforeSend: ns.setHeader
      });
    },

    postEffortHours: function(taskObj){
       $.ajax({
        url: ns.userDetails.baseUrl + 'rest-1.v1/Data/Actual',
        type: 'POST',
        data: '<Asset href="/VersionOne/rest-1.v1/New/Actual"><Relation name="Workitem" act="set"><Asset href="/VersionOne/rest-1.v1/Data/Task/'+ taskObj.taskId.split(':')[1] +'" idref="'+ taskObj.taskId +'"/></Relation><Attribute name="Date" act="set">2014-04-16</Attribute><Attribute name="Value" act="set">'+ taskObj.effort +'</Attribute></Asset>',
        success: ns.successFulPost,
        error: ns.errorPath,
        beforeSend: ns.setHeader
      });
    },

    fadeSlider: function(){
      $('#msgSlider').fadeOut('slow');
    },

    slider: function(txt, success){

      var slider =  $('#msgSlider');
          
      slider.empty();
      slider.removeClass();

      slider.addClass(success ? 'msg success' : 'msg error');
      
      slider.append(txt);
       
      if(success){
          slider.slideDown('slow', 'swing', function(){
              slider.css('display', 'inline-block');
              setTimeout(ns.fadeSlider, 3000);
              
           });
       }else{
         slider.slideDown('slow', function(){
            slider.css('display', 'inline-block');
         });
       }
    },

    buildBacklogUrl: function(id){
      return ns.userDetails.baseUrl + 'story.mvc/Summary?oidToken=' + id;
    },

    successFulPost: function(){
      ns.slider('Success: Task burnt down. Yay you!', true);
      ns.requestTasks();
      $('.loading').hide();
      $('.main').show();
    },

    setHeader: function(xhr){
      xhr.setRequestHeader('Authorization', 'Basic ' + btoa(ns.userDetails.uname));
      xhr.setRequestHeader('Accept', 'haljson');
    },

    showItems: function(response) {
      var res = response.Assets,
          btn,
          obj,
          objArr = [],
          groupedItems = {};

      
     if(res.length > 0){

          /*get the data out of the response, map it to an obj, and push the obj to an array*/

          for(var i =0; i < res.length; i++){
           
           obj = {
              "parentNumber": res[i].Attributes['Parent.Number'].value,
              "parentName" : res[i].Attributes['Parent.Name'].value,
              "parentUrl" : ns.buildBacklogUrl(res[i].Attributes['Parent'].value.idref),
              "taskName" : res[i].Attributes.Name.value,
              "detailEstimate" : res[i].Attributes.DetailEstimate.value,
              "hoursDone" : res[i].Attributes['Actuals.Value'].value.reduce(function(a,b){return a+b;},0),
              "taskId" : res[i].id,
              "toDo" : res[i].Attributes.ToDo.value,
              "taskStatus" : res[i].Attributes.Status.value.idref
          }
          objArr.push(obj);

        }

        /*Loop over array of objects and group them by parent number*/
        for (var j = 0; j < objArr.length; j++) {
          var o = objArr[j];
          if (!groupedItems[o.parentNumber]) {
            groupedItems[o.parentNumber] = [];
          }
          groupedItems[o.parentNumber].push(o);
        }

       // Loop over grouped items by parent ID (k)
       for(var k in groupedItems){
        if(groupedItems.hasOwnProperty(k)){
           //create a new object with the parent details and the tasks as a nested task object
          var tasks = groupedItems[k],
              obj = {
                "parentNumber" : tasks[0].parentNumber,
                "parentUrl" : tasks[0].parentUrl,
                "parentName" : tasks[0].parentName,
                "tasks" : tasks
              };

          //render parent details first
          var tplParent = '<span><p><a href="{{parentUrl}}" target="_new">{{parentNumber}} : {{parentName}}</a></p></span>';

          var result = Mustache.render(tplParent, obj);
            
          $('.main').append(result);

          //loop over the tasks in the object and render for each one
          for(var x=0; x<obj.tasks.length; x++){
            var task = obj.tasks[x];
            
            var tplTask = '<p class ="title">Task: {{taskName}}</p></span>\
                    <span>\
                    <ul>\
                      <li>Estimate:<input type="text" value="{{detailEstimate}}" class="inputHack" disabled="true" /></li>\
                      <li>Done:<input type="text" value="{{hoursDone}}" class="inputHack" disabled="true"/></li>\
                          <li><label>Effort:<input type="text" id="effort_{{taskId}}"/></label> </li>\
                          <li><label>To Do: <input type="text" id="toDo_{{taskId}}" value="{{toDo}}"/></label></li>\
                        </ul>\
                      </span>\
                      <span class="submitBox">\
                        <label>Task Complete?<input type="checkbox" value="complete" id="taskComplete_{{taskId}}"/></label>\
                        <input type="submit" value="Burn Down" id="burnIt_{{taskId}}"/>\
                      </span>\
                      <hr>';
              var taskResult = Mustache.render(tplTask, task);

              $('.main').append(taskResult);

            btn = document.getElementById('burnIt_' + task.taskId);

            btn.onclick = (function(taskObj) {
                return function(){
                  ns.getValues(taskObj);
                }
              }(task));            

          } 
        }
      

       }
     
       
      }else{ 

        $('.main').append('<span>Looks like you have no tasks in progress...slacker!</span>');
      }  

       $('.loading').hide();
    },

    showSettings: function(){
     
      if($('.main').css('display') == 'none'){   
          ns.showTasksView();

      }else{
         $('.main').hide();
        $('.settings').show();
      }
    },

    getValues: function(taskObj){

      taskObj.toDo =   document.getElementById('toDo_' + taskObj.taskId).value;
      taskObj.effort = document.getElementById('effort_' + taskObj.taskId).value;
      taskObj.hoursDone = taskObj.hoursDone + parseInt(document.getElementById('effort_' + taskObj.taskId).value);

      if(document.getElementById('taskComplete_' + taskObj.taskId).checked){

        if(taskObj.toDo > 0){
          ns.slider('Invalid request: Task cannot be set to complete as there are still hours to do.', false);
        }else{
          taskObj.taskStatus = ns.statusMap.Completed;
          ns.validateValues(taskObj);
        }
      }else{
        ns.validateValues(taskObj);
      }
    },

    validateValues: function(taskObj){

      //validate values
      if(taskObj.effort && taskObj.toDo){
        
        if($.isNumeric(taskObj.effort) && $.isNumeric(taskObj.toDo)){
        $('.main').html('');
        $('.loading').show();
          this.postToDoHours(taskObj);
        }else{
          ns.slider('Invalid input: the value you entered is not numeric.', false);
        }

      }else{
        ns.slider('Invalid input: Seems you have forgotten to enter some values.', false);
      } 

    },

    validateUser: function(uname, baseUrl, store, callback){
        $.ajax({
          url: baseUrl + 'rest-1.v1/Data/Member?where=Member.Username=%27'+ uname +'%27&accept=text/json',
          type: 'GET',
          success: function(response){
            if(response.total === 0){
                callback(false); 
            }else{
                if(store){
                  ns.storeUserInfo(uname, baseUrl);
                }
                callback(true);
            }
          },
          error: function(){callback(false)}, 
          beforeSend: ns.setHeader
          });
    },

    storeUserInfo: function(uname, baseUrl){
      chrome.storage.local.set({'username': uname, 'baseUrl': baseUrl}, function(){
          ns.userDetails.uname = uname;
          ns.userDetails.baseUrl = baseUrl;
        });
    },

    setUserDetails: function(){
      var uname = $('#uname').val(),
          baseUrl = $('#baseUrl').val(),
          unameChanged = false, 
          baseUrlChanged = false;

      //check what was changed
      if(uname !== ns.userDetails.uname){
          unameChanged = true;
      }

      if(baseUrl !== ns.userDetails.baseUrl){
        baseUrlChanged = true;
      }

      //both changed
          if(unameChanged && baseUrlChanged){
          ns.validateUser(uname, baseUrl, true, function(validUser){
            if(validUser){
             ns.reloadTasks();
            }else{
              ns.slider('Invalid User: Please make sure your details are correct and you are logged into Version One in your browser session.', false);
            }
           }); 
          } else if(unameChanged && !baseUrlChanged){
             ns.validateUser(uname, ns.userDetails.baseUrl, true, function(validUser){
            if(validUser){
             ns.reloadTasks();
            }else{
              ns.slider('Invalid Username: Please make sure the username you entered is valid.', false);
            }
           }); 
          } else if(!unameChanged && baseUrlChanged){
             ns.validateUser(ns.userDetails.uname, baseUrl, true, function(validUser){
            if(validUser){
             ns.reloadTasks();
            }else{
              ns.slider('Invalid Url: Please make sure the url you entered is valid.', false);
            }
           }); 
          } else {
              ns.slider('Invalid Input: You didn\'t change any values.', false);
          }
    },

    reloadTasks: function(){
       ns.requestTasks();
       ns.showTasksView();     
    }

  };

  document.addEventListener('DOMContentLoaded', function () {
    ns.attachInitialHandlers();
    ns.checkIfUserExists();
  });

}());








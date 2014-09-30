  //notification object
  notification : {
    type: 'basic',
    title: 'Reminder: Burn Down Tasks',
    message: 'Don\'t forget to burn down your version one tasks.',
    iconUrl: 'icon.png' 
  },

  createNotificationAlarm: function(){

    var d = new Date();

    d.setHours(16);
    d.setMinutes(00);

    chrome.alarms.create('Reminder', {when: d.getTime(), periodInMinutes:0.2});

    chrome.alarms.onAlarm.addListener(function(alarm){
	    chrome.notifications.create('', ns.notification, function(){
	      console.log('You\'ve been notified!');
	    });
    });
  }
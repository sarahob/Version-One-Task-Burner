
(function() {

	var bg = {
	   
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

	    chrome.alarms.create('Reminder', {when: d.getTime(), periodInMinutes:1440}); //Run every day at set time

	    chrome.alarms.onAlarm.addListener(function(alarm){
	      bg.createNotification();
	    });
	  },

	  createNotification: function(){
	    chrome.notifications.create('', bg.notification, function(){
	      console.log('You\'ve been notified!');
	    });
	  }

	};
	 
	chrome.runtime.onInstalled.addListener(function(){
		bg.createNotificationAlarm();
	});

}());
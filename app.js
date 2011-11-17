require.paths.unshift('./node_modules')

var express = require('express');
var fs = require('fs');
var app =  express.createServer();
var https = require('https');

var mongo = require('mongoskin');

var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

var people;
var projects;
var events;

function asorter(a, b) {
  return a.start_time-b.start_time;
}

function dsorter(a, b) {
  return b.start_time-a.start_time;
}

function formatDate(date) {
  var d = date;
  var hh = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();
  var dd = "AM";
  var h = hh;
  if (h >= 12) {
      h = hh-12;
      dd = "PM";
  }
  if (h == 0) {
      h = 12;
  }
  m = m<10?"0"+m:m;
  
  if(m == '00') {
    return h + dd;
  }
  
  s = s<10?"0"+s:s;


  var pattern = new RegExp("0?"+hh+":"+m+":"+s);
  return h+":"+m+dd;
}

function refreshCache () {
  mongo.db('heroku:hackers@staff.mongohq.com:10065/app1491090').collection('people').find().sort({'order':1}).toArray(function(err, items){
      people = items;
  });
  mongo.db('heroku:hackers@staff.mongohq.com:10065/app1491090').collection('projects').find().sort({'order':1}).toArray(function(err, items){
      projects = items;
  });
  
  https.get({
    host: 'graph.facebook.com',
    path: '/SuperBreakfastCereal/albums?access_token=AAACEdEose0cBABljA7jkLSXI1ECc2xZAEvFnjbmPOKFwHEWPepADZCYEOwGejUDBdOMaj1ILOrQ1a8N4LqHT4aFXQQ1pIsqUCfBvKWZCtxo5hJVyait'
  }, function(res) {
      var body = "";
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        try {
          albums = {}
          var album;
          for (var i in data) {
            album = data[i];
            albums.push(album);
          }
        } catch (error) {
          console.log(error.message);
        }
      });
  });
    
  
  https.get({
    host: 'api.facebook.com',
    path: '/method/events.get?uid=276905079008757&format=json&access_token=AAACDsVxgNQgBAIwkFjmFZAko2yF7iKDLsnGZCpLHY5ixs194Gf1hlVrMC7zWXIsxlZBiCRMZAB75kMAuZBG6aUomx7P46F9cZD'
  }, function(res) {
    var body = "";
    res.on('data', function(chunk){
      body += chunk;
    });
    res.on('end', function(){
      try {
        var ts = Math.round((new Date()).getTime() / 1000);
        events = {new: [], old: []};
        var data = JSON.parse(body);
        
        var event, date;
        for(var i in data) {
          event = data[i];
          date = new Date((event.start_time  - 8 * 60 * 60) * 1000);
          event.date = months[date.getMonth()] + " " + date.getDate();
          event.time = formatDate(date);
          event.description = event.description.split('\n').shift();
          
          if(event.start_time > ts) {
            events.new.push(event);
          } else {
            events.old.push(event);
          }
        }
        
        events.new.sort(asorter);
        events.old.sort(dsorter);
        
      } catch (e){console.log(e.message)}
    });
  });

  setTimeout(refreshCache, 60000);
}
refreshCache();

// Initialize main server
app.use(express.bodyParser());

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.get('/', function(req, res){
  res.render('home', {page: 'home', events: events});
});

app.get('/home', function(req, res){
  res.render('home', {page: 'home', events: events});
});

app.get('/sponsors', function(req, res){
  res.render('sponsors', {page: 'sponsors'});
});


app.get('/events', function(req, res){
  res.render('events', {page: 'events', events: events});
});

app.get('/people', function(req, res){
  res.render('people', {page: 'people', people: people});
});

app.get('/media', function(req, res){
  res.render('media', {page: 'media', albums: albums});
});

app.listen(process.env.PORT || 8086);



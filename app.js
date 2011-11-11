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

function sorter(a, b) {
  return a.start_time-b.start_time;
}

function refreshCache () {
  mongo.db('heroku:hackers@staff.mongohq.com:10065/app1491090').collection('people').find().sort({'order':1}).toArray(function(err, items){
      people = items;
  });
  mongo.db('heroku:hackers@staff.mongohq.com:10065/app1491090').collection('projects').find().sort({'order':1}).toArray(function(err, items){
      projects = items;
  });
  
  https.get({
    host: 'api.facebook.com',
    path: '/method/events.get?uid=276905079008757&format=json&access_token=AAACDsVxgNQgBAIwkFjmFZAko2yF7iKDLsnGZCpLHY5ixs194Gf1hlVrMC7zWXIsxlZBiCRMZAB75kMAuZBG6aUomx7P46F9cZD'
  }, function(res){
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
          date = new Date(event.start_time * 1000);
          event.date = months[date.getMonth()] + " " + date.getDate();
          if(event.start_time > ts) {
            events.new.push(event);
          } else {
            events.old.push(event);
          }
        }
        
        events.new.sort(sorter);
        events.old.sort(sorter);
        
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
  res.render('media', {page: 'media'});
});

app.listen(process.env.PORT || 8082);



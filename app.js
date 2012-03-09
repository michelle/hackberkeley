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

function getPhotos(manyalbums) {
  
  for (var j in manyalbums) {
    var inline_function = function(i) {
      var a = manyalbums[i];
      var aid = a['id'];
      var currpic = photographs[aid]['photos'] = [];
      
      var apath = '/' + aid + '/photos?limit=200&access_token=AAACl9M0dbJgBAKMtyld9DAzLxxMPPUybU86yZBrC3ZADZALtmTd5hTh3ODfZCzY1XQgQzWa4wLwQqvudyjKdL26GdqRQ8AkZBIZCZBfHcCzswZDZD';
      https.get({
        host: 'graph.facebook.com',
        path: apath
      }, function(res) {
          var body = "";
          res.on('data', function(chunk) {
          body += chunk;
        });
        res.on('end', function() {
          try {
            
            var data = JSON.parse(body);
            var pics = data['data'];
            a['icon'] = pics[0]['picture'];
            for (var j in pics) {
              var photo = {};
              photo['source'] = pics[j]['source'];
              currpic.push(photo);
            }
            //console.log(photographs['aid']);
            //console.log(currentalbum);
          } catch (error) {
            console.log(error.message);
          }
        }); 
      });
    }
    inline_function(j);
  }
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
    path: '/1295520723/albums?access_token=AAACl9M0dbJgBAKMtyld9DAzLxxMPPUybU86yZBrC3ZADZALtmTd5hTh3ODfZCzY1XQgQzWa4wLwQqvudyjKdL26GdqRQ8AkZBIZCZBfHcCzswZDZD'
  }, function(res) {
      var body = "";
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        try {
          albums = [];
          photographs = {};
          var album;
          var data = JSON.parse(body);
          for (var i in data['data']) {
            album = data['data'][i];
            if (album['name'].indexOf('@') != -1) {
              var currentalbum = {};
              
              currentalbum['name'] = album['name'].substring(4, album['name'].length);
              currentalbum['id'] = album['id'];
              
              currentid = album['id'];
              
              photographs[currentid] = [];
              photographs[currentid]['name'] = currentalbum['name'];
              
              albums.push(currentalbum);
            }
            
          }
          getPhotos(albums);
          
          
        } catch (error) {
          console.log(error.message);
        }
      });
  });

    
  
  https.get({
    host: 'api.facebook.com',
    path: '/method/events.get?uid=276905079008757&format=json&access_token=AAACl9M0dbJgBAKMtyld9DAzLxxMPPUybU86yZBrC3ZADZALtmTd5hTh3ODfZCzY1XQgQzWa4wLwQqvudyjKdL26GdqRQ8AkZBIZCZBfHcCzswZDZD'
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

app.get('/media/:id', function(req, res){
  var pid = req.params.id;
  var p = photographs[pid];
  if (p != undefined) {
    res.render('photos', {page: 'media', current: p});
  } else {
    res.redirect('/media');
  }
    
});

app.listen(process.env.PORT || 8086);



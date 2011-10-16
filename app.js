require.paths.unshift('./node_modules')

var express = require('express');
var fs = require('fs');
var app =  express.createServer();

// Initialize main server
app.use(express.bodyParser());

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.get('/', function(req, res){
  res.render('home', {page: 'home'});
});

app.get('/home', function(req, res){
  res.render('home', {page: 'home'});
});

app.get('/sponsors', function(req, res){
  res.render('sponsors', {page: 'sponsors'});
});


app.get('/projects', function(req, res){
  res.render('projects', {page: 'projects'});
});

app.get('/people', function(req, res){
  res.render('people', {page: 'people'});
});

app.get('/media', function(req, res){
  res.render('media', {page: 'media'});
});

app.listen(process.env.PORT || 8082);



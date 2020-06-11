const express = require('express');
const responseTime = require('response-time');
const axios = require('axios');
const redis = require('redis');

const app =express();

const client = redis.createClient();

client.on('error',(err)=>{
    console.log("Error: "+err);
});

app.use(responseTime());

app.get('/api/search', (req, res) => {
 
  const query = (req.query.query).trim();
  console.log(req);
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${query}`;

  
  return client.get(`${query}`, (err, result) => {
    console.log(result);
    if (result) {
      const resultJSON = JSON.parse(result);
      return res.status(200).json(resultJSON);
    } else { // Key does not exist in Redis store
      // Fetch directly from Wikipedia API
      return axios.get(searchUrl)
        .then(response => {
          const responseJSON = response.data;
          // Save the Wikipedia API response in Redis store
          client.setex(`${query}`, 3600, JSON.stringify({ source: 'Redis Cache', ...responseJSON, }));
          // Send JSON response to client
          return res.status(200).json({ source: 'Wikipedia API', ...responseJSON, });
        })
        .catch(err => {
          return res.json(err);
        });
    }
  });
});

app.listen(3000, () => {
  console.log('Server listening on port: ', 3000);
});
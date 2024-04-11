import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import env from "dotenv";
import pg from "pg";
env.config();
const app = express();
const port = 3000;
const apiKey = process.env.API_KEY;

app.use(express.static("public"));

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let response;
response = await axios.get(`https://newsapi.org/v2/top-headlines?country=in&apiKey=${apiKey}`);
let result;
result = response.data;

// console.log(response.data);

// for (let i=0;i<result.articles.length;i++){
//   const checkResult = await db.query("INSERT INTO news(source, title, description, url, urlToImage) VALUES($1,$2,$3,$4,$5);",
//   [result.articles[i].source.name, result.articles[i].title, result.articles[i].description, result.articles[i].url, result.articles[i].urlToImage])
// }



//GET all the current top headlines in India
app.get("/all", async(req, res) => {
  const result = await db.query("SELECT * FROM news;")
  res.json(result.rows);
});

//GET relevant news by filtering with source
app.get("/source", async(req, res) => {
  const name = req.query.name;
  const result = await db.query("SELECT * FROM news;")
  const filteredNews = result.rows.filter((news) =>  news.source.toLowerCase()===name.toLowerCase() || news.source.toLowerCase().includes(name.toLowerCase()));
  if (filteredNews.length!==0){
    res.json(filteredNews);
  }
  else{
    res
    .status(404)
    .json({error:`News with source '${name}' not found.`})
  }
})

//GET relevant news by filtering for keywords
app.get("/filter", async(req, res) => {
  const name = req.query.keyword.toLowerCase();
  const result = await db.query("SELECT * FROM news;")
  const filteredNews = result.rows.filter(filterKeyword);
  function filterKeyword(news){
    if (news.description!=null && name!=null){
      return news.title.toLowerCase().includes(name) || news.description.toLowerCase().includes(name);
    }
  }
  if (filteredNews.length!==0){
    res.json(filteredNews);
  }
  else{
    res
    .status(404)
    .json({error:`News with keyword '${name}' not found.`})
  }
})


app.listen(port, () => {
  console.log(`Successfully started server on port ${port}.`);
});




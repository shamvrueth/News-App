CREATE table users(
    id serial primary key,
    email varchar(100) not null,
    password varchar(100)
);

CREATE table news(
    id serial primary key,
    source varchar(50) not null,
    title text not null,
	description text,
	url text,
	urlToImage text
);

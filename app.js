const express = require('express') //imports express
const path =require('path') //imports path utils
require("dotenv").config();
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
//create a .env file and paste in your database url as
// DATABASE_URL=YOUR_CONNECTION_STRING_FROM_NEON


const app = express(); //creates express application and returns an object

const port = 3000
app.listen(port)
console.log("Server started..")

app.use(express.json())
app.use(express.urlencoded({extended:true}))



/* GET index listing. */
app.get('/', (req, res)=> {
    res.send('Infinity Marketplace API')
})


/* Users */

/* get all users */
app.get('/users',async (req,res)=>{
    const result = await sql`select * from users`
    // gets all of the users from users
    res.json(result)
    // returns a list of all users
})


/* create a user */
app.post('/users',async (req,res)=>{
    const name = req.body.name
    const user_name = req.body.user_name
    const balance = req.body.balance
    // gets the name, username, and balance
    const result = await sql`insert into users (name, user_name, balance) values (${name}, ${user_name}, ${balance}) returning *`
    // inserts the name, username, and balance into users and returns the inserted data
    res.json(result[0])
})

/* View User Profile */
app.get('/users/:user_name',async (req,res)=>{
    const user_name = req.params.user_name
    // gets the username from the url
    
    const user = await sql`select * from users where user_name = ${user_name}`
    // finds the user that matches the username from the user tables 
    
    if (user.length == 0){
        return res.send('Error: User not found')
        // handles case where user does not exist
    }
    
    const fullUser = user[0]
    const items = await sql`select * from products where owner = ${user_name}`
    // finds the user that matches the username from the products tables and gets their items
    
    fullUser.items = items
    // adds the items to the fullUser object
    res.json(fullUser)
    // sends back the fullUser object
})

/* Delete a User and their items */
app.delete('/users/:user_name',async (req,res)=>{
    const user_name = req.params.user_name
    // gets the username from the url
    await sql`delete from users where user_name = ${user_name}`
    // deletes the user that matches the username from the users table
    res.send('User deleted')
})


/* View all products */
app.get('/products', async (req, res) => {
    const result = await sql`select * from products`
    // gets all the items from the products table
    res.json(result)
})

/* Add a product */
app.post('/products',async (req,res)=>{
    const name = req.body.name
    const owner = req.body.owner
    const price = req.body.price
    // gets the item name, owner of the item, and the price
    const result = await sql`insert into products (name, owner, price) values (${name}, ${owner}, ${price}) returning *`
    // inserts the new item into the product table 
    res.json(result[0])
})

/* Buy a product */
app.post('/products/buy',async (req,res)=>{
    const user_name = req.body.buyer
    const productID = req.body.productID
    // gets the username and the product id
    
    const product = (await sql`select * from products where id = ${productID}`)[0]
    // finds the product that matches the id from the product table
    const buyer = (await sql`select * from users where user_name = ${user_name}`)[0]
    // finds the buyer that matches the username

    if (!product || !buyer){
        return res.send("Error: product or buyer does not exist!")
    // says the buyer does not exist or the product does not exist if one of them doesn't
    }

    if (product.owner == user_name){
        return res.send("Error: buyer already owns this item")
        // if the buyer already owns the item, it will send an error
    }

    if (parseInt(buyer.balance) < parseInt(product.price)){
        return res.send("Error: buyer has insufficient funds")
        // checks if the buyer has enough money to make the pruchase
    }

    await sql`update products set owner = ${user_name} where id = ${productID}`
    // updates the owner of the item to the buyer
    await sql`update users set balance = balance - ${product.price} where user_name = ${user_name}`
    // updates the buyers balance to reflect the changes
    await sql`update users set balance = balance + ${product.price} where user_name = ${product.owner}`
    // updates the sellers balance to reflect the changes

    res.send("transaction successful")
})

/** View all users and their items */
app.get('/summary',async (req,res)=>{
    const users = await sql`select * from users`
    // gets all the users
    
    for (let n of users) {
        n.items = await sql`select * from products where owner = ${n.user_name}`
        // gets all of the items for each user
    }
    
    res.json(users)
})

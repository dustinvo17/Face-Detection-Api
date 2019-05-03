const express = require('express')
const app = express();
const bodyParser = require('body-parser')
const cors = require('cors')
const bcrypt = require('bcrypt');
const Clarifai = require('clarifai')
app.use(cors())
app.use(bodyParser.urlencoded({
    extended: false
}))

app.use(bodyParser.json())

const knex = require('knex')({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        user: 'postgres',
        password: 'dat',
        database: 'postgres'
    }
});
app.post('/signin', (req, res) => {
    const {password,email} = req.body
    if (!email || !password){
        return res.status(400).json('Incorrect form submit')
    }
    knex
        .select('email', 'hash')
        .from('login')
        .where('email', '=', req.body.email)
        .then(data => {
            const passwordValie = bcrypt.compareSync(req.body.password, data[0].hash)
            if (passwordValie) {
                knex
                    .select('*')
                    .from('users')
                    .where('email', '=', req.body.email)
                    .then(user => res.json(user[0]))
                    .catch(err => res.status(400).json('unable to get user'))
            }
        })
        .catch(err => res.status(400).json('Wrong password'))
})
app.post('/register', (req, res) => {
    const {
        name,
        email,
        password
    } = req.body
    if (!email || !password || !name){
        return res.status(400).json('Incorrect form submit')
    }
    const hash = bcrypt.hashSync(password, 1);
    knex.transaction(trx => {
        trx('login')
            .insert({
                email: email,
                hash: hash
            })
            .returning('email')
            .then(emailRegis => {

                return trx('users').insert({
                        name: name,
                        email: emailRegis[0],
                        datejoined: new Date()
                    })
                    .returning('*')
                    .then(user => res.json(user[0]))

            })
            .then(trx.commit)
            .catch(trx.rollback);
    }).catch(err => res.status(400).json('get error'))

})

app.put('/image', (req, res) => {
    knex('users')
        .where('name', '=', req.body.name)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0])
        })
        .catch(err => res.status(400).json('Cant get the user'))
})
app.post('/imageurl', (req,res)=>{
    const app = new Clarifai.App({apiKey: '283d55b4e41b4a85accac4fbe342ce38'});
     app.models.initModel({id: Clarifai.FACE_DETECT_MODEL})
            .then(generalModel =>  generalModel.predict(req.body.input))
            .then(data => res.json(data))
            .catch(err => res.status(400).json('err'))
})

app.listen(3000, () => {
    console.log('App is running on 3000')
})
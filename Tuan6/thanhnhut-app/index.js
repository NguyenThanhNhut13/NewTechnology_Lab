const express = require('express');
const app = express();
const PORT = 3000;

// app.use(express.json({extended: false}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./views'));
app.set('view engine', 'ejs');
app.set('views', './views');


// config aws dynamodb
const AWS = require('aws-sdk');
const config = new AWS.Config({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'ap-southeast-1'
});

AWS.config = config;

const docClient = new AWS.DynamoDB.DocumentClient();

const tableName = 'Product';

const multer = require('multer');

const upload = multer();

app.post('/', upload.fields([]), (req, res) => {
    const {product_id, product_name, quantity} = req.body;

    const params = {
        TableName: tableName,
        Item: {
            "product_id": product_id,
            "product_name": product_name,
            "quantity": quantity
        }
    }

    docClient.put(params, (err, data) => {
        if (err) {
            res.send('Internal Server Error');
            console.log(err);
        } else {
            res.redirect('/');
        }
    });
});

app.post('/delete', upload.fields([]), (req, res) => {
    const itemList = Object.keys(req.body);

    console.log("Received body:", req.body);

    if (itemList.length === 0) {
        return res.redirect('/');
    }

    function onDeleteItem(index) {
        const params = {
            TableName: tableName,
            Key: {
                "product_id": itemList[index]
            }
        }

        docClient.delete(params, (err, data) => {
            if (err) {
                res.send('Internal Server Error');
            } else {
                if (index > 0) {
                    onDeleteItem(index - 1);
                }
                else {
                    res.redirect('/');
                }
            }
        });
    }

    onDeleteItem(itemList.length - 1);
});

app.get('/', (req, res) => {
    const params = {
        TableName: tableName
    }

    docClient.scan(params, (err, data) => {
        if (err) {
            res.send('Internal Server Error');
        } else {
            return res.render('index', {products: data.Items});
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
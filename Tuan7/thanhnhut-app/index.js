const express = require('express');
const app = express();
const PORT = 3000;
const { v4: uuidv4 } = require('uuid');

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
const s3 = new AWS.S3();

const multer = require('multer');

// multer config
const storage = multer.memoryStorage({
    destination(req, file, callback) {
        callback(null, '');
    }
});

//
function checkFileType(file, cb) {
    const fileTypes = /jpeg|jpg|png|gif/;

    // Check the extension
    const extname = fileTypes.test(file.originalname.toLowerCase());

    // Check the mimetype
    const mimetype = fileTypes.test(file.mimetype);

    // Check if the file is an image
    if (extname && mimetype) {
        return cb(null, true);
    }

    return cb('Error: Images Only!');
}

// Set up multer
const upload = multer({
    storage: storage,
    limits: {fileSize: 2000000}, // 2MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

const CLOUD_FRONT_URL = '';

app.post('/', upload.single('image'), (req, res) => {
    const {product_id, product_name, quantity} = req.body;

    const image = req.file.originalname.split('.');
    
    const fileType = image[image.length - 1];

    const filePath = `${uuidv4() + Date.now().toString()}.${fileType}`;

    const params = {
        Bucket: 'thanhnhut-bucket',
        Key: filePath,
        Body: req.file.buffer,
    }

    s3.upload(params, (err, data) => {
        if (err) {
            console.log('error =' + err);
            return res.send('Internal Server Error');
        } else {
            const newItem = {
                TableName: tableName,
                Item: {
                    "product_id": product_id,
                    "product_name": product_name,
                    "quantity": quantity,
                    "image_url": `${CLOUD_FRONT_URL}${filePath}`,
                }
            }
        
            docClient.put(newItem, (err, data) => {
                if (err) {
                    res.send('Internal Server Error 123');
                    console.log(err);
                } else {
                    res.redirect('/');
                }
            });
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
            res.send('Internal Server Error 11');
        } else {
            return res.render('index', {products: data.Items});
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
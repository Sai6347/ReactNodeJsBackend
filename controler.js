 
export function createUser(req, res) {
console.log(req);
const body = req.body; console.log(body);
const salt = genSaltSync(10);

body.password = hashSync(body.password, salt);
create(body, (err, results) => {
    if (err) {
        console.log(err);
        return res.status(500).json({
            success: 0,
            message: "Database connection errror"
        });
    }
    return res.status(200).json({
        success: 1,
        data: results
    });
    });
    }
    export function readName(req, res) {
        console.log(req.body);
        res.send('Birds home page' + req.query.name);

    }

    export default {readName,createUser}
const zipnearby = require("./nearby");
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

const main = async (zip, distance) => {
    const nearbyZips = await zipnearby.near(zip, distance, {
        datafile: "zipcodes.csv",
    });
    return nearbyZips;
};

const converToMeter = (distance, type) => {
    if (type === "km") {
        return Number(distance) * 1000;
    } else if (type === "mile") {
        return Number(distance) * 1609;
    }
    return 0;
};

app.use("/", express.static("public"));

app.get("/api/search/", async (req, res) => {
    const type = req.query.type;
    const distance = converToMeter(req.query.distance, type);
    const zip = req.query.zip;
    if (!distance || !zip) {
        res.status(400).json({
            status: "failed",
            message: "Please provide both distance (in mile) and zip",
        });
        return;
    }
    main(zip, distance)
        .then((output) => {
            res.status(200).json({
                status: "success",
                output,
            });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({
                status: "failed",
            });
        });
});

app.listen(PORT, () => {
    console.log(`Listening on *${PORT} 🚀`);
});

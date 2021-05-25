const csv = require('csv-parser')
const fs = require('fs')
const crypto = require('crypto')
const _ = require("lodash")

const NodeType = Object.freeze({
    ARTIST: "artist",
    ALBUM: "album",
    TRACK: "track"
});

function id(prefix, value) {
    return value ? prefix + "-" + crypto.createHash('md5').update(value).digest("hex") : null;
}

function artistId(data) {
    return id("ar", `[${data.artist}]`);
}

function albumId(data) {
    return id("al", `[${data.artist}]-[${data.album}]`);
}

function trackId(data) {
    return id("tr", `[${data.artist}]-[${data.album}]-[${data.track}]`)
}

function hasNode(results, type, id) {
    return _.find(results.nodes, node => node.type === type && node.id === id);
}

function hasLink(results, sourceId, targetId) {
    return !!_.find(results.links, link => link.source === sourceId && link.target === targetId);
}

const table = []
const artists = new Set()

fs.createReadStream('kouphax.csv')
    .pipe(csv(["artist", "album", "track", "date"]))
    .on('data', (data) => {
        table.unshift(data)
        artists.add(data.artist)
    })
    .on('end', () => {
        const index = []
        artists.forEach(artist => {

            const arId = artistId({ artist });

            console.log(`> compiling ${artist}`)
            const data = { id: arId, artist, nodes: [], links: [] };
            const entries = _.filter(table, r => r.artist === artist)

            index.push({ id: arId, artist: artist, plays: entries.length });

            data.nodes.push({ id: arId, title: artist, type: NodeType.ARTIST, count: entries.length })

            entries.forEach(entry => {
                const alId = albumId(entry);
                const tId = trackId(entry);
                const albumNode = hasNode(data, NodeType.ALBUM, alId);
                const trackNode = hasNode(data, NodeType.TRACK, tId);

                if (!albumNode) {
                    data.nodes.push({ id: alId, title: entry.album, type: NodeType.ALBUM, count: 1 })
                } else {
                    albumNode.count = albumNode.count + 1
                }

                if (!trackNode) {
                    data.nodes.push({ id: tId, title: entry.track, type: NodeType.TRACK, count: 1 })
                } else {
                    trackNode.count = trackNode.count + 1
                }

                // create album --> track link if necessary
                if (!hasLink(data, alId, tId)) {
                    data.links.push({ source: alId, target: tId })
                }

                // create artist --> album link if necessary
                if (!hasLink(data, arId, albumId(data))) {
                    data.links.push({ source: arId, target: alId })
                }
            })

            console.log(`< writing ${artist}`)

            fs.writeFileSync(`data/${arId}.json`, JSON.stringify(data, null, 2))
        })

        fs.writeFileSync(`data/index.json`, JSON.stringify(_.sortBy(index, c => -c.plays), null, 2))
    });



// fs.createReadStream('kouphax.csv')
//     .pipe(csv(["artist", "album", "track", "date"]))
//     .on('data', (data) => {

//         if (data.artist !== "NOFX") return;

//         // STRUCTURE: { artist, album, track, date}

//         const arId = artistId(data);
//         const alId = albumId(data);
//         const tId = trackId(data);


//         const artistNode = hasNode(results, NodeType.ARTIST, arId)
//         const albumNode = hasNode(results, NodeType.ALBUM, alId);
//         const trackNode = hasNode(results, NodeType.TRACK, tId);

//         // create artist node if necessary
//         if (!artistNode) {
//             results.nodes.push({ id: arId, title: data.artist, type: NodeType.ARTIST, count: 1 })
//         } else {
//             artistNode.count = artistNode.count + 1
//         }

//         // create album node if necessary
//         if (!albumNode) {
//             results.nodes.push({ id: alId, title: data.album, type: NodeType.ALBUM, count: 1 })
//         } else {
//             albumNode.count = albumNode.count + 1
//         }

//         // create track node if necessary
//         if (!trackNode) {
//             results.nodes.push({ id: tId, title: data.track, type: NodeType.TRACK, count: 1 })
//         } else {
//             trackNode.count = trackNode.count + 1
//         }

//         // create album --> track link if necessary
//         if (!hasLink(results, alId, tId)) {
//             results.links.push({ source: alId, target: tId })
//         }

//         // create artist --> album link if necessary
//         if (!hasLink(results, arId, albumId(data))) {
//             results.links.push({ source: arId, target: alId })
//         }

//     })
//     .on('end', () => {
//         console.dir(results);
//         fs.writeFileSync("kouphax.json", JSON.stringify(results, null, 2))
//     });
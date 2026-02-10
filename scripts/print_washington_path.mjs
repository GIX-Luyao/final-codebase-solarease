import https from 'https'
import { readFileSync } from 'fs'

const urls = [
  'https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_20m.json',
  'https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_040_00_500k.json'
]

function fetchJson(url){
  return new Promise((resolve,reject)=>{
    https.get(url, res=>{
      if(res.statusCode !== 200){ reject(new Error('Status '+res.statusCode)); return }
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', ()=>{
        try{ resolve(JSON.parse(data)) }catch(e){ reject(e) }
      })
    }).on('error', reject)
  })
}

function geoFeatureToPath(feature, width, height){
  if(!feature || !feature.geometry) return null
  const geom = feature.geometry
  const polys = []
  if(geom.type === 'Polygon') polys.push(geom.coordinates)
  else if(geom.type === 'MultiPolygon') polys.push(...geom.coordinates)
  else return null

  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity
  const flat = []
  for(const poly of polys){
    for(const ring of poly){
      for(const coord of ring){
        const [lon, lat] = coord
        if(lon < minX) minX = lon
        if(lon > maxX) maxX = lon
        if(lat < minY) minY = lat
        if(lat > maxY) maxY = lat
        flat.push([lon, lat])
      }
    }
  }
  if(!isFinite(minX)) return null
  const lonRange = maxX - minX || 1
  const latRange = maxY - minY || 1
  const project = (lon, lat)=>{
    const x = ((lon - minX) / lonRange) * width
    const y = ((maxY - lat) / latRange) * height
    return [x, y]
  }
  const allPointsCount = flat.length
  const maxPoints = 3000
  const stride = allPointsCount > maxPoints ? Math.ceil(allPointsCount / maxPoints) : 1
  let d = ''
  for(const poly of polys){
    for(const ring of poly){
      if(!ring || ring.length === 0) continue
      const pts = ring
      const [mx,my] = project(pts[0][0], pts[0][1])
      d += `M ${mx.toFixed(2)} ${my.toFixed(2)} `
      for(let i=1;i<pts.length;i+=stride){
        const [x,y] = project(pts[i][0], pts[i][1])
        d += `L ${x.toFixed(2)} ${y.toFixed(2)} `
      }
      d += 'Z '
    }
  }
  return d
}

;(async ()=>{
  for(const url of urls){
    try{
      console.log('Trying', url)
      const geo = await fetchJson(url)
      const features = Array.isArray(geo.features) ? geo.features : geo
      const feat = features.find(f => (f.properties && (f.properties.NAME === 'Washington' || f.properties.STATE === '53' || f.properties.NAME === 'WASHINGTON')))
      if(!feat){ console.log('Washington feature not found in', url); continue }
      const path = geoFeatureToPath(feat, 360, 180)
      if(path){
        console.log('Generated path length:', path.length)
        console.log(path.slice(0,1000))
        return
      }
    }catch(err){
      console.error('Failed on', url, err.message)
    }
  }
  console.error('All URLs failed')
})()

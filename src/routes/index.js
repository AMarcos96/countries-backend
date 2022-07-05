const { Router } = require('express');
// Importar todos los routers;
const Sequelize = require('sequelize')
const axios = require('axios');
const router = Router();

const { Country, Activity } = require('../db.js');

// Configurar los routers
// router.use('/countries', Countries);

const getAllInfo = async () => {
    const countriesUrl = await axios.get('https://restcountries.com/v3/all'); // Peticion a la API
    const countries = await countriesUrl.data.map(elem => {                   // devuelvo solo los datos que necesito
        return{
            name: elem.name.common,
            id: elem.cca3,
            flags: elem.flags[0],
            continent: elem.continents[0],
            capital: elem.capital != null ? elem.capital : 'Capital no encontrada',
            subregion: elem.subregion != null? elem.subregion : "Subregión no encontrada",
            area: elem.area,
            population: elem.population
        }
    });
    return countries;
}


router.get('/countries', async (req, res) => {

    const countries = await getAllInfo(); // lleno la base de datos

    const name = req.query.name;
    const nameOrder = req.query.nameOrder;      // extraigo los componentes que me pasan por query
    const popuOrder = req.query.popuOrder;     // para hacer los filtrados
    const continent = req.query.continent;

    try{
        
        let full = await Country.findAll({
            include: {
                model: Activity,
            }
        })
        
        if(!full.length){
            await Country.bulkCreate(countries)     // si no hay nada en mi Base de datos la lleno
        } 
    } catch (error){
        console.log(error) 
    }

    if(name){
        let countryName = await Country.findAll({       // si me pasan un name busco coincidencias 
            where : {
                name: {
                    [Sequelize.Op.iLike] : `%${name}%`
                }
            }
        })
        countryName.length ?
        res.send(countryName) :
        res.status(404).send('País no encontrado, verifique el input')

    } else if(nameOrder){
        let orderByName = await Country.findAll({       // Si me pasan un orden por nombres los ordeno aqui
            include: {                                  // con el orden (nameOrder) que me pasen (A-Z o Z-A)
                model: Activity
            },
            order: [["name", nameOrder]]                
        })
        res.send(orderByName)

    } else if(popuOrder){                              // Si me pasan un orden por poblacion los ordeno aqui
        try {
        let country = await Country.findAll({
            order : [['population', popuOrder]],
            include: {
                model: Activity,
            }
        })
        res.status(200).send(country)
        } catch (error) {
        res.status(500).send('Error')
        }

    }else if(continent){                            // Si me pasan un continente específico busco coincidencias aqui
        let countriesByContinent = await Country.findAll({
            where: {
                continent: continent
            },
            include:{
                model: Activity
            },
            order: [["name", "ASC"]]        // y los ordeno por nombre A-Z
        })
        res.send(countriesByContinent)

    } else {
        let full = await Country.findAll({  // Sino por defecto muestro los paises ordenados por nombres A-Z
            include: {
                model: Activity
            },
            order: [['name', "ASC"]]
        })
        res.status(200).send(full)
    }
})

router.get('/countries/:id', async (req,res) => {

    const countryId = req.params.id             // extraigo el id que me pasen por params

    let countryById = await Country.findByPk(countryId, { // findByPk busca por id, entonces le paso mi id de params
        include : {
            model : Activity
        }
    })

    res.status(200).send(countryById)
})

router.get('/activity', async (req,res) => {
    try {
        let activities = await Activity.findAll() // simplemente muestro todas las actividades que tengo
        res.status(200).send(activities)
    } catch (errors) {
        res.status(500).send('Error')
    }
})

router.post('/activity', async (req,res) => {
    try{
        let {name, difficulty, duration, season, countries} = req.body // extraigo los datos para crear mi actividad
        
        let newActivity = await Activity.create({
            name,
            difficulty,
            duration,
            season
        })

        // Reviso el array de paises para ver en cual se debe crear la actividad 
        countries.forEach(async (country) => {
            let activityCountry = await Country.findOne({
                where: {
                    name: country   // en el país que coincida con el name que me pasan
                }
            }) 
            await newActivity.addCountry(activityCountry)
        });
        res.status(200).send('Actividad creada')
    } catch(error) {
        console.log(error)
        res.status(500).send('No se pudo crear la actividad')
    }
})



module.exports = router;
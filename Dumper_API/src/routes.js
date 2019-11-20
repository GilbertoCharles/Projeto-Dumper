const express = require("express");
const bodyParser = require("body-parser");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const util = require('util');
const fs = require('fs');
const _ = require('lodash');
const UsuarioController = require('./controllers/UsuarioController');
const PontoDescarteController = require('./controllers/PontoDescarteController');
const FaleConoscoController = require('./controllers/FaleConoscoController')
const dialogflow = require("dialogflow");
const { struct } = require("pb-util");
const routes = express.Router();
require('dotenv').config()

/* Rotas de pontos */

routes.get("/listPoint", PontoDescarteController.index);

routes.get("/deletePoint/:id", PontoDescarteController.delete);

routes.get("/validatePoint/:id", PontoDescarteController.validate);

routes.post("/savePoint", PontoDescarteController.store);


/* Rotas de Usuarios */

routes.get("/deleteUser/:id", UsuarioController.delete);

routes.get("/listUser", UsuarioController.index);

routes.post("/saveUser", UsuarioController.store);

routes.post("/login", UsuarioController.login);

/* Rotas de mensagem */

routes.get("/deleteMessage/:id", FaleConoscoController.delete);
routes.get("/getMessages", FaleConoscoController.getMessage);
routes.post("/sendMessage", FaleConoscoController.sendMessage);


// Dialogflow


const privateKey = _.replace(process.env.DIALOGFLOW_PRIVATE_KEY, new RegExp("\\\\n", "\g"), "\n")

var dialogflowClient = {
    projectId: process.env.DIALOGFLOW_PROJECT_ID,
    sessionClient: new dialogflow.SessionsClient({
        credentials: {
            client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
            private_key: privateKey
        }
    })
}

routes.post('/dialog', async(req, res) => {
    let { text, email, sessionId } = req.body
    let { projectId, sessionClient } = dialogflowClient
    let sessionPath = sessionClient.sessionPath(projectId, sessionId)

    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: `${text}`,
                languageCode: "pt-BR"
            }
        },
        queryParams: {
            contexts: [{
                name: `projects/${projectId}/agent/sessions/${sessionId}/contexts/_context_data`,
                lifespanCount: 5,
                parameters: struct.encode({ u_email: email, sessionId: sessionId })
            }]
        }
    };

    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    if (result.intent) {
        res.send({
            query: result.queryText,
            response: result.fulfillmentText,
            intent: result.intent.displayName
        })
        console.log(result.queryText, result.fulfillmentText, result.intent.displayName)
    } else {
        res.send({
            query: result.queryText,
            response: result.fulfillmentText,
            intent: 'Intent não detectada'
        })
        console.log(result.queryText, result.fulfillmentText)
    }
})

routes.use(bodyParser.json())
routes.use(bodyParser.urlencoded({ extended: true }))

module.exports = routes;
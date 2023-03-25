import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import jsonBodyParser from "@middy/http-json-body-parser";
import httpResponseSerializerMiddleware from '@middy/http-response-serializer';

export function addMiddleWare(handler: any) {
    return middy(handler)
        .use(jsonBodyParser())
        .use(
            httpResponseSerializerMiddleware({
            serializers: [
                {
                regex: /^application\/json$/,
                serializer: ({ body }) => JSON.stringify(body)
                }
            ],
            defaultContentType: 'application/json'
            })
        )
        // .use(
        //   validator({
        //     inputSchema: placeOrderCommand,
        //   })
        // )
        .use(httpErrorHandler());
}
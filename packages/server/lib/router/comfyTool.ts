import { restful } from '../utils/restful'

restful('ComfyTool', {
  query: `
    id 
    name 
    description 
    workflowDefinition 
    workflowParameters 
        { id name description dataType prop isRequired isToolParameter min max minFloat maxFloat isRandom randomBit defaultValue } 
    endNode 
    isEnabled 
    createdAt 
    updatedAt
    `,
  where: {},
})

restful('ComfyToolParameter', {
  query:
    'id name description dataType prop isRequired isToolParameter min max minFloat maxFloat isRandom randomBit defaultValue createdAt updatedAt',
  where: {},
})

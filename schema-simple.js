import { html, render } from "https://unpkg.com/lit-html@3.2.1/lit-html.js";
import { unsafeHTML } from "https://unpkg.com/lit-html@3.2.1/directives/unsafe-html.js";

(async function () {
    const table = document.getElementById("config");
    const response = await fetch(`./schema.json`);
    const json = await response.json();

    render(
        html`
            <table class="schema-table">
                <thead>
                    <tr>
                        <th>Property Path</th>
                        <th>Type</th>
                        <th>Default/Example</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${template(json.definitions, undefined, json.$ref, "")}
                </tbody>
            </table>
        `,
        table
    );
})();

function* template(definitions, parentDefinition, ref, parentPath) {
    const name = ref.replace("#/definitions/", "");
    const definition = definitions[name];
    
    if (!definition || !definition.properties) {
        return;
    }

    for (const [key, propDef] of Object.entries(definition.properties)) {
        const currentPath = parentPath ? `${parentPath}.${key}` : key;
        const required = definition.required && definition.required.includes(key);
        
        // Get value information
        let value = propDef.default;
        let valueType = "default";
        
        if (propDef.enum && propDef.enum.length > 0) {
            value = propDef.enum[0];
            valueType = "enumeration";
        } else if (propDef.const) {
            value = propDef.const;
            valueType = "constant";
        } else if (propDef.examples && propDef.examples.length > 0) {
            value = propDef.examples[0];
            valueType = "example";
        }

        // Determine type
        let type = propDef.type;
        if (propDef.$ref) {
            const refName = propDef.$ref.replace("#/definitions/", "");
            const refDef = definitions[refName];
            type = refDef.type || "object";
        } else if (propDef.items && propDef.items.$ref) {
            const refName = propDef.items.$ref.replace("#/definitions/", "");
            const refDef = definitions[refName];
            type = `${refDef.type || "object"}[]`;
        }

        const description = propDef["x-intellij-html-description"] || propDef.description || "";

        yield html`
            <tr class="${required ? 'required' : ''}">
                <td>${currentPath}</td>
                <td>${type}</td>
                <td title="${valueType}">${value !== undefined ? JSON.stringify(value) : ""}</td>
                <td>${unsafeHTML(description)}</td>
            </tr>
        `;

        // Process nested definitions
        if (propDef.$ref) {
            yield* template(definitions, propDef, propDef.$ref, currentPath);
        } else if (propDef.items && propDef.items.$ref) {
            yield* template(definitions, propDef, propDef.items.$ref, currentPath);
        }
    }
}
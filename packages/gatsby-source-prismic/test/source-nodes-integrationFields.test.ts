import test from "ava";
import * as sinon from "sinon";
import * as mswNode from "msw/node";
import * as prismicM from "@prismicio/mock";

import { createAPIQueryMockedRequest } from "./__testutils__/createAPIQueryMockedRequest";
import { createAPIRepositoryMockedRequest } from "./__testutils__/createAPIRepositoryMockedRequest";
import { createGatsbyContext } from "./__testutils__/createGatsbyContext";
import { createMockCustomTypeModelWithFields } from "./__testutils__/createMockCustomTypeModelWithFields";
import { createPluginOptions } from "./__testutils__/createPluginOptions";

import { createSchemaCustomization, sourceNodes } from "../src/gatsby-node";

const server = mswNode.setupServer();
test.before(() => server.listen({ onUnhandledRequest: "error" }));
test.after(() => server.close());

test("integration fields are normalized to inferred nodes", async (t) => {
	const gatsbyContext = createGatsbyContext();
	const pluginOptions = createPluginOptions(t);

	const customTypeModel = createMockCustomTypeModelWithFields(t, {
		integrationFields: prismicM.model.integrationFields({ seed: t.title }),
	});
	// A known ID is needed to test the type name later in the test.
	customTypeModel.id = "foo";
	const document = prismicM.value.document({
		seed: t.title,
		model: customTypeModel,
	});
	const repositoryResponse = prismicM.api.repository({ seed: t.title });
	const queryResponse = prismicM.api.query({
		seed: t.title,
		documents: [document],
	});

	pluginOptions.customTypeModels = [customTypeModel];

	server.use(
		createAPIRepositoryMockedRequest({
			pluginOptions,
			repositoryResponse,
		}),
	);
	server.use(
		createAPIQueryMockedRequest({
			pluginOptions,
			repositoryResponse,
			queryResponse,
		}),
	);

	// @ts-expect-error - Partial gatsbyContext provided
	await createSchemaCustomization(gatsbyContext, pluginOptions);
	// @ts-expect-error - Partial gatsbyContext provided
	await sourceNodes(gatsbyContext, pluginOptions);

	const createNodeStub = gatsbyContext.actions.createNode as sinon.SinonStub;

	for (const doc of queryResponse.results) {
		t.true(
			createNodeStub.calledWith(
				sinon.match({
					prismicId: doc.id,
					data: sinon.match({
						integrationFields: sinon.match.string,
					}),
				}),
			),
		);
	}

	t.true(
		createNodeStub.calledWith(
			sinon.match({
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				prismicId: document.data.integrationFields!.id,
				internal: sinon.match({
					type: "PrismicPrefixFooDataIntegrationFieldsIntegrationType",
				}),
			}),
		),
	);
});
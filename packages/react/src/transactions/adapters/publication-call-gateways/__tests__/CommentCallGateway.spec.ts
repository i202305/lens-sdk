import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { faker } from '@faker-js/faker';
import { omitTypename } from '@lens-protocol/api-bindings';
import {
  createMockApolloClientWithMultipleResponses,
  mockRelayerResultFragment,
  mockCreateCommentTypedDataMutation,
  createCreateCommentTypedDataMutationMockedResponse,
  createCreateCommentViaDispatcherMutationMockedResponse,
} from '@lens-protocol/api-bindings/mocks';
import { NativeTransaction } from '@lens-protocol/domain/entities';
import { mockNonce, mockCreateCommentRequest } from '@lens-protocol/domain/mocks';
import { ChainType } from '@lens-protocol/shared-kernel';

import { UnsignedLensProtocolCall } from '../../../../wallet/adapters/ConcreteWallet';
import { FailedUploadError, MetadataUploadAdapter } from '../../MetadataUploadAdapter';
import { mockITransactionFactory } from '../../__helpers__/mocks';
import { CommentCallGateway } from '../CommentCallGateway';
import {
  createBasicExerciseData,
  createFeeCollectModuleExcerciseData,
  createFeeCollectModuleFollowersOnlyExcerciseData,
  createFollowerOnlyReferenceModuleExcerciseData,
  createFreeCollectModuleExcerciseData,
  createFreeCollectModuleFollowersOnlyExcerciseData,
  createLimitedFeeCollectModuleExcerciseData,
  createLimitedFeeCollectModuleFollowersOnlyExcerciseData,
  createLimitedTimedFeeCollectModuleExcerciseData,
  createLimitedTimedFeeCollectModuleFollowersOnlyExcerciseData,
  PublicationExerciseData,
  createFevertCollectModuleExcerciseData,
  createSupportedNFTAttributesExcerciseData,
  createTimedFeeCollectModuleExcerciseData,
  createTimedFeeCollectModuleFollowersOnlyExcerciseData,
} from '../__helpers__/publication-exercise-data';

function setupTestScenario({
  apolloClient,
  contentURI,
}: {
  apolloClient: ApolloClient<NormalizedCacheObject>;
  contentURI?: string;
}) {
  const transactionFactory = mockITransactionFactory();
  const uploadSpy = jest.fn();

  if (contentURI) {
    uploadSpy.mockResolvedValue(contentURI);
  } else {
    uploadSpy.mockRejectedValue(new Error('Unknown error'));
  }

  const gateway = new CommentCallGateway(
    apolloClient,
    transactionFactory,
    new MetadataUploadAdapter(uploadSpy),
  );

  return { gateway, uploadSpy };
}

describe(`Given an instance of ${CommentCallGateway.name}`, () => {
  describe.each<{
    description: string;
    createExerciseData: () => PublicationExerciseData;
  }>([
    {
      description:
        'locale, content focus, text, media content and basic metadata (name, description)',
      createExerciseData: createBasicExerciseData,
    },
    {
      description: 'all supported NFT attribute types',
      createExerciseData: createSupportedNFTAttributesExcerciseData,
    },
    {
      description: 'Follower Only Reference Module',
      createExerciseData: createFollowerOnlyReferenceModuleExcerciseData,
    },
    {
      description: 'Revert Collect Module',
      createExerciseData: createFevertCollectModuleExcerciseData,
    },
    {
      description: 'Free Collect Module (anybody)',
      createExerciseData: createFreeCollectModuleExcerciseData,
    },
    {
      description: 'Free Collect Module (followers only)',
      createExerciseData: createFreeCollectModuleFollowersOnlyExcerciseData,
    },
    {
      description: 'Fee Collect Module (anybody)',
      createExerciseData: createFeeCollectModuleExcerciseData,
    },
    {
      description: 'Fee Collect Module (followers only)',
      createExerciseData: createFeeCollectModuleFollowersOnlyExcerciseData,
    },
    {
      description: 'Limited Fee Collect Module (anybody)',
      createExerciseData: createLimitedFeeCollectModuleExcerciseData,
    },
    {
      description: 'Limited Fee Collect Module (followers only)',
      createExerciseData: createLimitedFeeCollectModuleFollowersOnlyExcerciseData,
    },
    {
      description: 'Timed Fee Collect Module (anybody)',
      createExerciseData: createTimedFeeCollectModuleExcerciseData,
    },
    {
      description: 'Timed Fee Collect Module (followers only)',
      createExerciseData: createTimedFeeCollectModuleFollowersOnlyExcerciseData,
    },
    {
      description: 'Limited Timed Fee Collect Module (anybody)',
      createExerciseData: createLimitedTimedFeeCollectModuleExcerciseData,
    },
    {
      description: 'Limited Timed Fee Collect Module (followers only)',
      createExerciseData: createLimitedTimedFeeCollectModuleFollowersOnlyExcerciseData,
    },
  ])(`and $description`, ({ createExerciseData }) => {
    const { requestVars, expectedMutationRequestDetails } = createExerciseData();
    const request = mockCreateCommentRequest(requestVars);
    const contentURI = faker.internet.url();

    describe(`when creating an ${UnsignedLensProtocolCall.name}<CreateCommentRequest>`, () => {
      it(`should create an instance of the ${UnsignedLensProtocolCall.name} with the expected typed data`, async () => {
        const createCommentTypedDataMutation = mockCreateCommentTypedDataMutation();
        const apolloClient = createMockApolloClientWithMultipleResponses([
          createCreateCommentTypedDataMutationMockedResponse({
            variables: {
              request: {
                contentURI,
                profileId: request.profileId,
                publicationId: request.publicationId,
                ...expectedMutationRequestDetails,
              },
            },
            data: createCommentTypedDataMutation,
          }),
        ]);
        const { gateway } = setupTestScenario({ apolloClient, contentURI });

        const unsignedCall = await gateway.createUnsignedProtocolCall(request);

        expect(unsignedCall).toBeInstanceOf(UnsignedLensProtocolCall);
        expect(unsignedCall.typedData).toEqual(
          omitTypename(createCommentTypedDataMutation.result.typedData),
        );
      });

      it(`should be possible to override the signature nonce`, async () => {
        const nonce = mockNonce();
        const apolloClient = createMockApolloClientWithMultipleResponses([
          createCreateCommentTypedDataMutationMockedResponse({
            variables: {
              request: {
                contentURI,
                profileId: request.profileId,
                publicationId: request.publicationId,
                ...expectedMutationRequestDetails,
              },
              options: {
                overrideSigNonce: nonce,
              },
            },
            data: mockCreateCommentTypedDataMutation({ nonce }),
          }),
        ]);
        const { gateway } = setupTestScenario({ apolloClient, contentURI });

        const unsignedCall = await gateway.createUnsignedProtocolCall(request, nonce);

        expect(unsignedCall.nonce).toEqual(nonce);
      });

      it(`should throw a ${FailedUploadError.name} if the Publication Metadata upload fails`, async () => {
        const apolloClient = createMockApolloClientWithMultipleResponses([]);
        const { gateway } = setupTestScenario({ apolloClient });

        await expect(() => gateway.createUnsignedProtocolCall(request)).rejects.toThrow(
          FailedUploadError,
        );
      });
    });

    describe(`when creating a ${NativeTransaction.name}<CreateCommentRequest>}" method`, () => {
      it(`should create an instance of the ${NativeTransaction.name}`, async () => {
        const apolloClient = createMockApolloClientWithMultipleResponses([
          createCreateCommentViaDispatcherMutationMockedResponse({
            variables: {
              request: {
                contentURI,
                profileId: request.profileId,
                publicationId: request.publicationId,

                ...expectedMutationRequestDetails,
              },
            },
            data: {
              result: mockRelayerResultFragment(),
            },
          }),
        ]);

        const { gateway } = setupTestScenario({ apolloClient, contentURI });

        const transaction = await gateway.createDelegatedTransaction(request);

        await transaction.waitNextEvent();
        expect(transaction).toBeInstanceOf(NativeTransaction);
        expect(transaction).toEqual(
          expect.objectContaining({
            chainType: ChainType.POLYGON,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            id: expect.any(String),
            request,
          }),
        );
      });

      it(`should throw a ${FailedUploadError.name} if the Publication Metadata upload fails`, async () => {
        const apolloClient = createMockApolloClientWithMultipleResponses([]);
        const { gateway } = setupTestScenario({ apolloClient });

        await expect(() => gateway.createDelegatedTransaction(request)).rejects.toThrow(
          FailedUploadError,
        );
      });
    });
  });
});

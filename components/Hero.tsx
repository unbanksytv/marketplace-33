import { FC, useEffect, useState, ComponentProps, useRef } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import { paths } from '@reservoir0x/reservoir-kit-client'
import { BidModal } from '@reservoir0x/reservoir-kit-ui'
import { useNetwork, useSigner } from 'wagmi'
import AttributeOfferModal from './AttributeOfferModal'
import Toast from 'components/Toast'
import toast from 'react-hot-toast'
import useCollectionStats from 'hooks/useCollectionStats'
import useCollection from 'hooks/useCollection'
import { useRouter } from 'next/router'
import useTokens from 'hooks/useTokens'
import HeroSocialLinks from 'components/hero/HeroSocialLinks'
import HeroBackground from 'components/hero/HeroBackground'
import HeroStats from 'components/hero/HeroStats'
import Sweep from './Sweep'
import ReactMarkdown from 'react-markdown'
import { useMediaQuery } from '@react-hookz/web'

const envBannerImage = process.env.NEXT_PUBLIC_BANNER_IMAGE
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID
const ENV_COLLECTION_DESCRIPTIONS =
  process.env.NEXT_PUBLIC_COLLECTION_DESCRIPTIONS

const setToast = (data: ComponentProps<typeof Toast>['data']) => {
  toast.custom((t) => <Toast t={t} toast={toast} data={data} />)
}

type Props = {
  collectionId: string | undefined
  fallback: {
    tokens: paths['/tokens/v4']['get']['responses']['200']['schema']
    collection: paths['/collection/v3']['get']['responses']['200']['schema']
  }
}

type AttibuteModalProps = ComponentProps<typeof AttributeOfferModal>

const Hero: FC<Props> = ({ fallback, collectionId }) => {
  const { data: signer } = useSigner()
  const collection = useCollection(fallback.collection, collectionId)
  const router = useRouter()
  const stats = useCollectionStats(router, collectionId)
  const [attribute, setAttribute] = useState<
    AttibuteModalProps['data']['attribute']
  >({
    key: undefined,
    value: undefined,
  })
  const { tokens } = useTokens(collectionId, [fallback.tokens], router)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const descriptionRef = useRef<HTMLParagraphElement | null>(null)
  const isSmallDevice = useMediaQuery('only screen and (max-width : 750px)')
  const { chain: activeChain } = useNetwork()

  useEffect(() => {
    const keys = Object.keys(router.query)
    const attributesSelected = keys.filter(
      (key) =>
        key.startsWith('attributes[') &&
        key.endsWith(']') &&
        router.query[key] !== ''
    )

    // Only enable the attribute modal if one attribute is selected
    if (attributesSelected.length !== 1) {
      setAttribute({
        // Extract the key from the query key: attributes[{key}]
        key: undefined,
        value: undefined,
      })
      return
    }

    setAttribute({
      // Extract the key from the query key: attributes[{key}]
      key: attributesSelected[0].slice(11, -1),
      value: router.query[attributesSelected[0]]?.toString(),
    })
  }, [router.query])

  if (!CHAIN_ID) {
    throw 'A Chain id is required'
  }

  const env: AttibuteModalProps['env'] = {
    chainId: +CHAIN_ID as ChainId,
  }

  const isInTheWrongNetwork = Boolean(signer && activeChain?.id !== env.chainId)

  const floor = collection.data?.collection?.floorAsk

  const statsObj = {
    count: Number(collection.data?.collection?.tokenCount ?? 0),
    topOffer: collection.data?.collection?.topBid?.value,
    floor: floor?.price,
    allTime: collection.data?.collection?.volume?.allTime,
    volumeChange: collection.data?.collection?.volumeChange?.['1day'],
    floorChange: collection.data?.collection?.floorSaleChange?.['1day'],
  }

  const bannerImage =
    envBannerImage || collection?.data?.collection?.metadata?.bannerImageUrl

  //Split on commas outside of backticks (`)
  let envDescriptions = ENV_COLLECTION_DESCRIPTIONS
    ? ENV_COLLECTION_DESCRIPTIONS.split(/,(?=(?:[^\`]*\`[^\`]*\`)*[^\`]*$)/)
    : null
  let envDescription = null

  if (envDescriptions && envDescriptions.length > 0) {
    envDescriptions.find((description) => {
      const descriptionPieces = description.split('::')
      if (descriptionPieces[0] == collectionId) {
        envDescription = descriptionPieces[1].replace(/`/g, '')
      }
    })
  }

  const description =
    envDescription ||
    (collection?.data?.collection?.metadata?.description as string | undefined)
  const header = {
    banner: bannerImage as string,
    image: collection?.data?.collection?.metadata?.imageUrl as string,
    name: collection?.data?.collection?.name,
    description: description,
    shortDescription: description ? description.slice(0, 150) : description,
  }

  const isSupported =
    !!collection.data?.collection?.tokenSetId &&
    !!collection.data?.collection?.collectionBidSupported

  const isAttributeModal = !!attribute.key && !!attribute.value

  const royalties: AttibuteModalProps['royalties'] = {
    bps: collection.data?.collection?.royalties?.bps,
    recipient: collection.data?.collection?.royalties?.recipient,
  }

  const attributeData: AttibuteModalProps['data'] = {
    collection: {
      id: collection.data?.collection?.id,
      image: collection?.data?.collection?.metadata?.imageUrl as string,
      name: collection?.data?.collection?.name,
      tokenCount: stats?.data?.stats?.tokenCount ?? 0,
    },
    attribute,
  }

  let isLongDescription = false
  let descriptionHeight = '60px'

  if (descriptionRef.current) {
    isLongDescription = descriptionRef.current.clientHeight > 60
    descriptionHeight = descriptionExpanded
      ? `${descriptionRef.current.clientHeight}px`
      : '60px'
  }

  return (
    <>
      <HeroBackground banner={header.banner}>
        <div className="z-10 flex w-full flex-col items-center gap-6">
          <img
            className="h-20 w-20 rounded-full"
            alt={`${header.name} Logo`}
            src={header.image}
          />
          <h1 className="reservoir-h4 text-center text-black dark:text-white">
            {header.name}
          </h1>
          <HeroSocialLinks collection={collection?.data?.collection} />
          <HeroStats stats={statsObj} />
          {header.description && (
            <>
              <div
                className="relative overflow-hidden transition-[max-height] ease-in-out md:w-[423px]"
                style={{ maxHeight: descriptionHeight }}
              >
                <p
                  ref={descriptionRef}
                  className="text-center text-sm text-[#262626] transition-[width] duration-300 ease-in-out dark:text-white"
                >
                  <ReactMarkdown linkTarget="_blank">
                    {header.description}
                  </ReactMarkdown>
                </p>
              </div>
              {isLongDescription && (
                <a
                  className="mt-[-18px]"
                  onClick={(e) => {
                    e.preventDefault()
                    setDescriptionExpanded(!descriptionExpanded)
                  }}
                >
                  <FiChevronDown
                    className={`h-5 w-5 text-black transition-transform dark:text-white ${
                      descriptionExpanded ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </a>
              )}
            </>
          )}
          <div className="flex w-full flex-col justify-center gap-4 md:flex-row">
            {isSupported &&
              (isAttributeModal ? (
                <AttributeOfferModal
                  royalties={royalties}
                  signer={signer}
                  data={attributeData}
                  env={env}
                  stats={stats}
                  tokens={tokens}
                  setToast={setToast}
                />
              ) : (
                <BidModal
                  collectionId={collection?.data?.collection?.id}
                  trigger={
                    <button
                      disabled={isInTheWrongNetwork}
                      className="btn-primary-outline min-w-[222px] whitespace-nowrap border border-[#D4D4D4] bg-white text-black dark:border-[#525252] dark:bg-black dark:text-white dark:ring-[#525252] dark:focus:ring-4"
                    >
                      Make a Collection Offer
                    </button>
                  }
                  onBidComplete={() => {
                    stats.mutate()
                    tokens.mutate()
                  }}
                  onBidError={(error) => {
                    if (error) {
                      if (
                        (error as any).cause.code &&
                        (error as any).cause.code === 4001
                      ) {
                        setToast({
                          kind: 'error',
                          message: 'You have canceled the transaction.',
                          title: 'User canceled transaction',
                        })
                        return
                      }
                    }
                    setToast({
                      kind: 'error',
                      message: 'The transaction was not completed.',
                      title: 'Could not place bid',
                    })
                  }}
                />
              ))}
            {isSmallDevice && (
              <Sweep
                collection={collection}
                tokens={tokens}
                setToast={setToast}
              />
            )}
          </div>
        </div>
      </HeroBackground>
    </>
  )
}

export default Hero

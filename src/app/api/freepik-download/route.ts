import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate Freepik URL
    const urlObj = new URL(url)
    if (!urlObj.hostname.includes('freepik.com') && !urlObj.hostname.includes('freepik.es')) {
      return NextResponse.json({ error: 'Invalid Freepik URL' }, { status: 400 })
    }

    // Extract image ID from URL
    const match = url.match(/\/([^\/]+)\.htm/)
    if (!match) {
      return NextResponse.json({ error: 'Could not parse image ID from URL' }, { status: 400 })
    }

    const imageId = match[1]

    // Construct high-quality image URL
    // Freepik images are often available in different formats and resolutions
    const possibleUrls = [
      `https://img.freepik.com/free-photo/${imageId}.jpg?size=626&ext=jpg`,
      `https://img.freepik.com/free-vector/${imageId}.jpg?size=626&ext=jpg`,
      `https://img.freepik.com/premium-photo/${imageId}.jpg?size=626&ext=jpg`,
      `https://img.freepik.com/premium-vector/${imageId}.jpg?size=626&ext=jpg`,
      `https://img.freepik.com/free-psd/${imageId}.jpg?size=626&ext=jpg`,
      `https://img.freepik.com/premium-psd/${imageId}.jpg?size=626&ext=jpg`
    ]

    // Try to fetch the image from different possible URLs
    let imageResponse: Response | null = null

    for (const imageUrl of possibleUrls) {
      try {
        const response = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.freepik.com/',
          },
        })

        if (response.ok) {
          imageResponse = response
          break
        }
      } catch {
        continue
      }
    }

    if (!imageResponse) {
      // If direct image URLs don't work, try to scrape the page
      try {
        const pageResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        })

        if (!pageResponse.ok) {
          return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 })
        }

        const html = await pageResponse.text()
        
        // Try to find the image URL in the HTML
        const imageUrlMatch = html.match(/data-src="([^"]*\.jpg[^"]*)"/) || 
                             html.match(/src="([^"]*\.jpg[^"]*)"/) ||
                             html.match(/data-lazy-src="([^"]*\.jpg[^"]*)"/)

        if (imageUrlMatch) {
          let imageUrl = imageUrlMatch[1]
          
          // Clean up the URL
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl
          } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://img.freepik.com' + imageUrl
          }

          // Remove size restrictions and watermark parameters
          imageUrl = imageUrl.replace(/[?&]size=[^&]*/, '')
          imageUrl = imageUrl.replace(/[?&]ext=[^&]*/, '')
          imageUrl = imageUrl.replace(/[?&]watermark=[^&]*/, '')
          
          // Add high quality parameters
          const separator = imageUrl.includes('?') ? '&' : '?'
          imageUrl += `${separator}size=626&ext=jpg`

          imageResponse = await fetch(imageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Referer': 'https://www.freepik.com/',
            },
          })
        }
      } catch (err) {
        console.error('Error scraping page:', err)
      }
    }

    if (!imageResponse || !imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
    }

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer()
    
    // Return the image
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${imageId}.jpg"`,
      },
    })

  } catch (err) {
    console.error('Error downloading image:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
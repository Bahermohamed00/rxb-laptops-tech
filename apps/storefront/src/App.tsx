import { useState } from 'react'
import HomePage from './features/home/HomePage'
import IntroScreen from './features/intro/IntroScreen'

export default function App() {
  const [introVisible, setIntroVisible] = useState(true)

  return <>
    <HomePage introVisible={introVisible} />
    {introVisible && <IntroScreen onComplete={() => setIntroVisible(false)} />}
  </>
}

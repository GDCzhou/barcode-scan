import { useCounterStore } from '@/stores/counter'

export default function main() {
  const counterStore = useCounterStore()
  console.log(counterStore.count)
  console.log('Hello World')
}

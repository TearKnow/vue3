export interface Person {
  id: number
  name: string
  age: number

}

// 下面的写法是等价的
export type Employee = Person[]
// export type Employee = Array<Person>

'use client'

import { ArrowUpRight, MapPin } from 'lucide-react'
import Image from 'next/image'
import HalalElfida from '@/assets/img/HalalElfida.png'
import Salima from '@/assets/img/Salima.png'
import Elfida from '@/assets/img/Elfida.png'
import Royal from '@/assets/img/Royal.png'
import MuliaPark from '@/assets/img/MuliaPark.png'
import ArrayMap from '../atoms/ArrayMap'
import { Each, useComputed } from 'use-react-utilities'

export default function Project() {
  const listProject = useComputed(() => [
    {
      name: 'Perumahan Halal Elfida Mulia',
      image: HalalElfida,
      location: 'Jl. Mulia, Jl. KH. Harun Nafsi Samarinda, Kalimantan Timur',
      tipe: ['Ahsan', 'Mumtaz', 'Sultan', '+6'],
    },
    {
      name: 'Salima Memorial Park - Sambutan',
      image: Salima,
      location: 'Jl. Sultan Sulaiman Sambutan, Samarinda, Kalimantan Timur',
      tipe: ['Single', 'Couple', 'Family', '+1'],
    },
    {
      name: 'Pesona Elfida',
      image: Elfida,
      location: 'Jl. Gn. Lingai Sungai Pinang, Samarinda, Kalimantan Timur',
      tipe: ['Al Kalam', 'Al Karim'],
    },
    {
      name: 'Royal Garden Panglima',
      image: Royal,
      location: 'Jl. Magelang, Lempake, Samarinda, Kalimantan Timur',
      tipe: ['Kaving Produktif', 'Kavling Villa'],
    },
    {
      name: 'Mulia Park Regency',
      image: MuliaPark,
      location: 'Jl. Mulia, Jl. KH. Harun Nafsi Samarinda, Kalimantan Timur',
      tipe: ['Kaving', 'Kavling Hook'],
    },
  ])
  return (
    <section
      id="project"
      className="py-[80px] md:px-[120px] px-[20px] bg-secondary"
    >
      <div>
        <h3>Project</h3>
        <small className="text-muted-foreground">
          Berikut adalah daftar project dari Panglima Propertindo
        </small>
      </div>
      <div className="grid md:grid-cols-3 grid-cols-1 grid-rows-2 gap-4 mt-[40px]">
        <ArrayMap
          of={listProject.value}
          render={(item, index) => (
            <div
              key={index + 'listproject'}
              className="bg-white p-3 rounded-lg"
            >
              <Image
                src={item.image}
                width={0}
                height={0}
                className="w-full "
                objectFit="fill"
                alt="Halal Elfida"
              />
              <div className=" text-lg font-semibold mt-5">{item.name}</div>
              <div className="flex items-center gap-2 mt-5">
                <MapPin className="text-accent" />
                <div className="flex flex-col">
                  <p className="text-sm line-clamp-1">{item.location}</p>
                  <button
                    onClick={() =>
                      window.open('http://maps.google.com/?q=' + item.location)
                    }
                    className="underline text-accent flex items-center gap-1 cursor-pointer"
                  >
                    Lihat di Map <ArrowUpRight />
                  </button>
                </div>
              </div>
              <div className="mt-5 flex flex-col">
                <div className="text-muted-foreground text-sm">Tipe Unit</div>
                <div className="mt-2 flex items-center gap-2 overflow-auto">
                  <Each
                    of={item.tipe}
                    render={(item, index) => (
                      <div
                        key={index + 'tipe'}
                        className="rounded-full border border-accent px-2 py-1 text-sm bg-accent/10 w-fit text-nowrap"
                      >
                        {item}
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </section>
  )
}

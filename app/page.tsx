// kayen li t9olhom w kayen li non
"use client";
import { motion } from "framer-motion";

import { GoArrowRight, GoBook } from "react-icons/go";
import TransitionLink from "@/components/animations/transition-link";
import { Button } from "@heroui/button";
import { Bell } from "lucide-react";
import Image from "next/image";
import logo from "@/public/logo2.png";

export default function Home() {
  return (
    <div className="bg-background text-foreground coming-soon-page-background">
      <div className="mx-auto max-w-screen-xl py-32 lg:flex lg:h-screen lg:items-center">
        <div className="mx-auto sm:max-w-xl  items-center justify-center lg:w-full text-center w-3/4">
          <motion.h1
            className="text-5xl text_gradient mb-5"
            initial={{
              opacity: 0,
              scale: 0.3,
              translateY: 50,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              translateY: 0,
            }}
            transition={{ duration: 1.2 }}
          >
            Dispertando seu lado
            <br />
            Gearhead
          </motion.h1>
          <motion.p
            className="mt-4 sm:text-xl/relaxed mb-5 text_gradient"
            initial={{
              opacity: 0,
              scale: 0.3,
              translateY: 0,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              translateY: 0,
            }}
            transition={{ duration: 1.2 }}
          >
            "Não são apenas carros.."
          </motion.p>
          <motion.div
            className="mt-8 flex sm:flex-row flex-col items-center justify-center gap-4 mb-5 "
            initial={{
              opacity: 0,
              scale: 0.3,
              translateY: 0,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              translateY: 0,
            }}
            transition={{ duration: 1.2 }}
          >
            <Button
            startContent={<Bell width={20} height={20}/>}
              className="rounded-xl border border-solid bg-green-700"
              color="success"
              variant="shadow"
              isDisabled={true}
            >
              Me notifique do lançamento
            </Button>
          </motion.div>   
        </div>
      </div>
    </div>
  );
}
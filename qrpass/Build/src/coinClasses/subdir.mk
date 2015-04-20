################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../src/coinClasses/CoinKey.cpp 

OBJS += \
./src/coinClasses/CoinKey.o 

CPP_DEPS += \
./src/coinClasses/CoinKey.d 


# Each subdirectory must supply rules for building sources it contributes
src/coinClasses/%.o: ../src/coinClasses/%.cpp
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	$(GPP) -O3 -Wall -c -fmessage-length=0 -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '



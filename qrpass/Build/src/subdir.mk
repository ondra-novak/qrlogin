################################################################################
# Automatically-generated file. Do not edit!
################################################################################

# Add inputs and outputs from these tool invocations to the build variables 
CPP_SRCS += \
../src/RewritePath.cpp \
../src/SrvMain.cpp \
../src/signmsg.cpp 

OBJS += \
./src/RewritePath.o \
./src/SrvMain.o \
./src/signmsg.o 

CPP_DEPS += \
./src/RewritePath.d \
./src/SrvMain.d \
./src/signmsg.d 


# Each subdirectory must supply rules for building sources it contributes
src/%.o: ../src/%.cpp
	@echo 'Building file: $<'
	@echo 'Invoking: GCC C++ Compiler'
	$(GPP) -O3 -Wall -c -fmessage-length=0 -MMD -MP -MF"$(@:%.o=%.d)" -MT"$(@:%.o=%.d)" -o "$@" "$<"
	@echo 'Finished building: $<'
	@echo ' '


